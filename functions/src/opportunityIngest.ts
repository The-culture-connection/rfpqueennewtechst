/**
 * Opportunity Ingestion System
 * 
 * Fetches opportunities from multiple API endpoints, normalizes them into a canonical
 * schema, and upserts them into the "Opportunity CRM" Firestore collection.
 * 
 * HOW TO ADD NEW SOURCES:
 * 1. Add your source configuration to the SOURCES_JSON environment variable
 * 2. Ensure your API endpoint returns data in one of the supported formats:
 *    - Plain array: []
 *    - Object with items: { items: [] }
 *    - Object with data: { data: [] }
 *    - Object with results: { results: [] }
 * 3. Update the normalizeOpportunity() function to map your source's field names
 *    to the canonical schema (see comments in that function)
 * 
 * No code changes needed beyond updating the config and field mappings!
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { getAdminFirestore } from './webhook/firebaseAdmin';

// ============================================================================
// TYPES
// ============================================================================

type AuthConfig =
  | { type: 'bearer'; token: string }
  | { type: 'apiKey'; headerName?: string; queryParam?: string; token: string }
  | { type: 'none' };

type SourceConfig = {
  source: string;
  endpointUrl: string;
  auth?: AuthConfig;
  method?: 'GET' | 'POST'; // HTTP method (default: GET)
  requestBody?: any; // For POST requests, the JSON body to send
  additionalQueryParams?: Record<string, string>; // Additional query params (e.g., cx for Google Search)
};

type NormalizedOpportunity = {
  id: string; // Canonical unique id (also doc id)
  type: string;
  title: string;
  description: string;
  deadline_yyyy_mm_dd: string; // YYYY-MM-DD or ""
  amount_min: number;
  amount_max: number;
  currency: string;
  status: string;
  geographies: string; // Pipe-delimited like "US|US-OH"
  org_types: string; // Pipe-delimited like "for_profit|startup"
  stages: string; // Pipe-delimited like "mvp|revenue"
  industry_tags: string; // Pipe-delimited like "health|ai"
  use_of_funds_tags: string; // Pipe-delimited
  requirements: string; // Pipe-delimited
  source: string;
  source_url: string;
  effort_level: string;
  source_opportunity_id: string | null;
  lastSeenAt: admin.firestore.Timestamp;
  ingestedAt: admin.firestore.Timestamp;
  rawHash: string; // SHA256 of raw payload
  searchText: string; // Lowercased concatenation of title + description + tags
};

const OPPS_COLLECTION = 'Opportunity CRM';
const LOGS_COLLECTION = 'Ingestion Logs';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Define secret from Firebase Secret Manager
 * 
 * Set the secret using:
 * firebase functions:secrets:set SOURCES_JSON
 */
const sourcesJsonSecret = defineSecret('SOURCES_JSON');

/**
 * Get source configurations from Firebase Secret Manager or environment variable
 * 
 * Priority:
 * 1. Firebase Secret Manager (production)
 * 2. Environment variable (local development)
 * 
 * Format: JSON array
 * [
 *   {
 *     "source": "grantsGov",
 *     "endpointUrl": "https://api.example.com/opportunities",
 *     "auth": {
 *       "type": "apiKey",
 *       "queryParam": "api_key",
 *       "token": "your-token-here"
 *     }
 *   }
 * ]
 */
function getSources(): SourceConfig[] {
  // Try secret first (production), then fallback to env var (local dev)
  const secretValue = sourcesJsonSecret.value();
  const envValue = process.env.SOURCES_JSON;
  const raw = secretValue || envValue;
  
  if (!raw) {
    logger.warn('[Ingestion] SOURCES_JSON not configured. Set secret or env var.');
    logger.warn('[Ingestion] Secret value exists: ' + (secretValue ? 'yes' : 'no'));
    logger.warn('[Ingestion] Env var exists: ' + (envValue ? 'yes' : 'no'));
    return [];
  }
  
  logger.info(`[Ingestion] SOURCES_JSON found (${secretValue ? 'secret' : 'env var'}), length: ${raw.length}`);
  
  try {
    const parsed = JSON.parse(raw) as SourceConfig[];
    logger.info(`[Ingestion] Parsed ${parsed.length} source(s) from config`);
    return parsed;
  } catch (error: any) {
    logger.error('[Ingestion] Failed to parse SOURCES_JSON', error);
    logger.error('[Ingestion] Raw value preview: ' + raw.substring(0, 200));
    return [];
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function stableDocId(
  source: string,
  sourceOppId: string | null,
  sourceUrl: string,
  title: string,
  deadline: string
): string {
  const fallback = sha256(`${sourceUrl}|${title}|${deadline}`);
  return `${source}:${sourceOppId ?? fallback}`;
}

function toYYYYMMDD(value: unknown): string {
  if (!value) return '';
  // Accept Date, timestamp ms, ISO strings, or already "YYYY-MM-DD"
  try {
    if (typeof value === 'string') {
      const s = value.trim();
      // Already in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      // Try parsing as date
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      return '';
    }
    if (typeof value === 'number') {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    if (value instanceof Date) {
      if (!isNaN(value.getTime())) return value.toISOString().slice(0, 10);
    }
    return '';
  } catch {
    return '';
  }
}

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number' && isFinite(value)) return value;
  if (typeof value === 'string') {
    // Remove currency symbols and commas
    const cleaned = value.replace(/[$,]/g, '').trim();
    const n = Number(cleaned);
    return isFinite(n) ? n : fallback;
  }
  return fallback;
}

/**
 * Normalize pipe-delimited fields
 * Accepts: "US|US-OH", "US, US-OH", ["US","US-OH"], etc.
 * Returns: normalized pipe-delimited string with lowercase, underscores, unique values
 */
function normalizePipeList(value: unknown): string {
  const parts: string[] = [];
  const pushToken = (t: string) => {
    const cleaned = t
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^\w\-:]/g, ''); // Keep ISO-like codes and underscores
    if (cleaned) parts.push(cleaned);
  };

  if (Array.isArray(value)) {
    for (const v of value) pushToken(String(v));
  } else if (typeof value === 'string') {
    // Split on comma or pipe
    for (const tok of value.split(/[|,]/g)) pushToken(tok);
  } else if (value) {
    pushToken(String(value));
  }

  // Unique, stable sort
  const uniq = Array.from(new Set(parts));
  uniq.sort();
  return uniq.join('|');
}

function clampSearchText(s: string, maxLen = 20000): string {
  const trimmed = s.trim();
  return trimmed.length <= maxLen ? trimmed : trimmed.slice(0, maxLen);
}

function buildSearchText(o: Omit<NormalizedOpportunity, 'searchText'>): string {
  const blob = [
    o.title,
    o.description,
    o.type,
    o.status,
    o.geographies,
    o.org_types,
    o.stages,
    o.industry_tags,
    o.use_of_funds_tags,
    o.requirements,
    o.source,
  ]
    .filter(Boolean)
    .join(' ');
  return clampSearchText(blob.toLowerCase());
}

// ============================================================================
// FETCHING WITH RETRY & PAGINATION
// ============================================================================

/**
 * Fetch JSON with retry logic (3 tries with exponential backoff)
 * Retries on 429, 5xx, and network errors
 */
async function fetchJsonWithRetry(
  url: string,
  init: RequestInit,
  tries = 3
): Promise<any> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);

      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        const body = await res.text().catch(() => '');
        throw new Error(
          `HTTP ${res.status} retryable. body=${body.slice(0, 500)}`
        );
      }
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}. body=${body.slice(0, 500)}`);
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) {
        // Exponential backoff with jitter
        const backoffMs = Math.round(500 * Math.pow(2, i) + Math.random() * 250);
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }
  }
  throw lastErr;
}

/**
 * Apply authentication to request
 */
function applyAuth(
  url: string,
  auth?: AuthConfig
): { url: string; headers: Record<string, string> } {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json', // Capital C and T (required by some APIs)
  };
  if (!auth || auth.type === 'none') return { url, headers };

  if (auth.type === 'bearer') {
    headers['authorization'] = `Bearer ${auth.token}`;
    return { url, headers };
  }

  // apiKey
  if (auth.headerName) {
    headers[auth.headerName] = auth.token;
    return { url, headers };
  }
  if (auth.queryParam) {
    const u = new URL(url);
    u.searchParams.set(auth.queryParam, auth.token);
    return { url: u.toString(), headers };
  }
  // fallback: no-op
  return { url, headers };
}

/**
 * Fetch all items from a source with pagination support
 * Handles multiple pagination formats:
 * - { items: [], nextPageToken }
 * - { data: [], next: "https://..." }
 * - { results: [], pagination: { next: ... } }
 * - Plain array []
 * - Grants.gov format: { data: { oppHits: [] } }
 * - Simpler.Grants.gov format: { opportunities: [] }
 */
async function fetchAllItemsForSource(source: SourceConfig): Promise<any[]> {
  const out: any[] = [];
  const method = source.method || 'GET';
  let nextUrl: string | null = source.endpointUrl;
  let nextPageToken: string | null = null;
  let pageOffset = 1;

  for (let page = 0; page < 50; page++) {
    if (!nextUrl) break;

    const u = new URL(nextUrl);

    // Add additional query params (e.g., cx for Google Search)
    if (source.additionalQueryParams) {
      for (const [key, value] of Object.entries(source.additionalQueryParams)) {
        u.searchParams.set(key, value);
      }
    }

    // If token-based pagination, pass token
    if (nextPageToken) {
      u.searchParams.set('pageToken', nextPageToken);
    }

    const { url, headers } = applyAuth(u.toString(), source.auth);

    // Build request init
    const requestInit: RequestInit = {
      method,
      headers,
    };

    // For POST requests, add request body
    if (method === 'POST') {
      let requestBody = source.requestBody || {};
      
      // Handle pagination in POST body (e.g., Simpler.Grants.gov)
      if (source.source === 'simplerGrants' && requestBody.pagination) {
        requestBody = {
          ...requestBody,
          pagination: {
            ...requestBody.pagination,
            page_offset: pageOffset,
          },
        };
      }
      
      // Ensure Content-Type header is properly set
      if (!requestInit.headers) {
        requestInit.headers = {};
      }
      (requestInit.headers as Record<string, string>)['Content-Type'] = 'application/json';
      
      requestInit.body = JSON.stringify(requestBody);
      
      logger.info(
        `[Ingestion] POST ${source.source} to ${url}, body: ${JSON.stringify(requestBody).substring(0, 200)}`
      );
    }

    const payload = await fetchJsonWithRetry(url, requestInit);

    // Debug logging for SAM.gov to see response structure
    if (source.source === 'samGov') {
      logger.info(
        `[Ingestion] SAM.gov response keys: ${Object.keys(payload).join(', ')}`
      );
      logger.info(
        `[Ingestion] SAM.gov response sample: ${JSON.stringify(payload).substring(0, 500)}`
      );
    }

    // Extract items from various response shapes
    let items: any[] = [];
    
    // Grants.gov format: { data: { oppHits: [] } }
    if (payload.data?.oppHits && Array.isArray(payload.data.oppHits)) {
      items = payload.data.oppHits;
    }
    // Simpler.Grants.gov format: { opportunities: [] }
    else if (Array.isArray(payload.opportunities)) {
      items = payload.opportunities;
    }
    // Google Search format: { items: [] }
    else if (Array.isArray(payload.items)) {
      items = payload.items;
    }
    // Plain array (e.g., mock opportunities API)
    else if (Array.isArray(payload)) {
      items = payload;
    }
    // SAM.gov format: { opportunitiesData: [] }
    else if (source.source === 'samGov') {
      if (Array.isArray(payload.opportunitiesData)) {
        items = payload.opportunitiesData;
        logger.info(
          `[Ingestion] SAM.gov: Found ${items.length} items in opportunitiesData (totalRecords: ${payload.totalRecords})`
        );
      } else if (Array.isArray(payload.opportunityData)) {
        items = payload.opportunityData;
      } else if (Array.isArray(payload.opportunities)) {
        items = payload.opportunities;
      } else if (Array.isArray(payload.data)) {
        items = payload.data;
      } else if (Array.isArray(payload.results)) {
        items = payload.results;
      } else {
        logger.warn(
          `[Ingestion] SAM.gov: Could not find items array. Response structure: ${JSON.stringify(Object.keys(payload))}`
        );
      }
    }
    // Other formats
    else if (Array.isArray(payload.data)) {
      items = payload.data;
    } else if (Array.isArray(payload.results)) {
      items = payload.results;
    }

    out.push(...items);

    // Determine next page
    // Grants.gov doesn't use pagination in the same way - stop after first page
    if (source.source === 'grantsGov') {
      break; // Grants.gov returns all results in one response
    }
    
    // Simpler.Grants.gov pagination
    if (source.source === 'simplerGrants' && payload.pagination) {
      const totalPages = payload.pagination.total_pages || 1;
      if (pageOffset >= totalPages) {
        break;
      }
      pageOffset++;
      continue; // Continue with next page
    }

    // Standard pagination
    nextPageToken =
      typeof payload.nextPageToken === 'string' ? payload.nextPageToken : null;
    nextUrl = typeof payload.next === 'string' ? payload.next : null;
    if (!nextUrl && payload.pagination?.next) {
      nextUrl = String(payload.pagination.next);
    }

    // Stop when no pagination is present
    if (!nextUrl && !nextPageToken) break;
  }

  return out;
}

// ============================================================================
// NORMALIZATION
// ============================================================================

/**
 * Normalize raw opportunity data into canonical schema
 * 
 * IMPORTANT: This is where you map your source-specific field names to the
 * canonical schema. Update the field mappings below to match your API responses.
 * 
 * Common field name variations are already handled, but you may need to add
 * source-specific mappings.
 */
export function normalizeOpportunity(
  raw: any,
  source: SourceConfig,
  now: admin.firestore.Timestamp
): NormalizedOpportunity {
  // Extract source opportunity ID (try common field names)
  const sourceOppId: string | null =
    raw?.source_opportunity_id ??
    raw?.id ??
    raw?.opportunityId ??
    raw?.opportunity_id ??
    raw?.noticeId ??
    raw?.grantNumber ??
    null;

  // Map common fields with fallbacks
  const type = String(raw?.type ?? raw?.opportunityType ?? raw?.category ?? 'unknown');
  const title = String(raw?.title ?? raw?.name ?? raw?.opportunityTitle ?? 'Untitled');
  const description = String(
    raw?.description ?? raw?.summary ?? raw?.details ?? raw?.abstract ?? ''
  );
  const deadline = toYYYYMMDD(
    raw?.deadline ??
    raw?.closeDate ??
    raw?.dueDate ??
    raw?.applicationDeadline ??
    raw?.closingDate ??
    ''
  );
  const amountMin = toNumber(
    raw?.amount_min ?? raw?.amountMin ?? raw?.minAward ?? raw?.awardMin ?? raw?.minAmount,
    0
  );
  const amountMax = toNumber(
    raw?.amount_max ?? raw?.amountMax ?? raw?.maxAward ?? raw?.awardMax ?? raw?.maxAmount,
    0
  );
  const currency = String(raw?.currency ?? raw?.awardCurrency ?? 'USD');
  const status = String(
    raw?.status ?? (deadline ? 'open' : 'rolling')
  );

  // Normalize pipe-delimited fields
  const geographies = normalizePipeList(
    raw?.geographies ??
    raw?.geography ??
    raw?.eligibleLocations ??
    raw?.location ??
    'US'
  );
  const orgTypes = normalizePipeList(
    raw?.org_types ??
    raw?.orgTypes ??
    raw?.eligibleOrgTypes ??
    raw?.organizationTypes ??
    ''
  );
  const stages = normalizePipeList(
    raw?.stages ??
    raw?.stage ??
    raw?.eligibleStages ??
    raw?.companyStages ??
    ''
  );
  const industryTags = normalizePipeList(
    raw?.industry_tags ??
    raw?.industryTags ??
    raw?.industries ??
    raw?.sectors ??
    ''
  );
  const useOfFunds = normalizePipeList(
    raw?.use_of_funds_tags ??
    raw?.useOfFundsTags ??
    raw?.allowableUses ??
    raw?.fundingPurposes ??
    ''
  );
  const requirements = normalizePipeList(
    raw?.requirements ??
    raw?.requiredDocuments ??
    raw?.applicationRequirements ??
    raw?.eligibilityRequirements ??
    ''
  );
  const sourceUrl = String(
    raw?.source_url ?? raw?.url ?? raw?.link ?? raw?.opportunityUrl ?? ''
  );

  const effortLevel = String(
    raw?.effort_level ?? raw?.effortLevel ?? raw?.applicationEffort ?? 'med'
  );

  // Generate hash and doc ID
  const rawHash = sha256(JSON.stringify(raw ?? {}));
  const docId = stableDocId(source.source, sourceOppId, sourceUrl, title, deadline);

  // Build base object (ingestedAt will be set in upsert logic if doc is new)
  const base: Omit<NormalizedOpportunity, 'searchText'> = {
    id: docId,
    type,
    title,
    description,
    deadline_yyyy_mm_dd: deadline,
    amount_min: amountMin,
    amount_max: Math.max(amountMax, amountMin), // Ensure max >= min
    currency,
    status,
    geographies,
    org_types: orgTypes,
    stages,
    industry_tags: industryTags,
    use_of_funds_tags: useOfFunds,
    requirements,
    source: source.source,
    source_url: sourceUrl,
    effort_level: effortLevel,
    source_opportunity_id: sourceOppId,
    lastSeenAt: now,
    ingestedAt: now, // May be overwritten in upsert if doc exists
    rawHash,
  };

  return { ...base, searchText: buildSearchText(base) };
}

// ============================================================================
// FIRESTORE UPSERT
// ============================================================================

/**
 * Upsert opportunities in batches (max 500 writes per batch)
 * 
 * Logic:
 * - Always update lastSeenAt
 * - Preserve ingestedAt if doc exists (only set on creation)
 * - Skip heavy updates if rawHash unchanged (optimization)
 */
async function upsertOpportunities(
  normalized: NormalizedOpportunity[]
): Promise<{ upserted: number; skipped: number }> {
  const db = getAdminFirestore();
  let upserted = 0;
  let skipped = 0;

  // Batch size cap (450 to leave room for other operations)
  const chunks: NormalizedOpportunity[][] = [];
  for (let i = 0; i < normalized.length; i += 450) {
    chunks.push(normalized.slice(i, i + 450));
  }

  for (const chunk of chunks) {
    // Read existing docs for ingestedAt preservation + rawHash change detection
    const refs = chunk.map((o) => db.collection(OPPS_COLLECTION).doc(o.id));
    const snaps = await db.getAll(...refs);

    const existingById = new Map<string, admin.firestore.DocumentSnapshot>();
    for (const s of snaps) {
      if (s.exists) {
        existingById.set(s.id, s);
      }
    }

    let batch = db.batch();
    let opsInBatch = 0;

    for (const o of chunk) {
      const ref = db.collection(OPPS_COLLECTION).doc(o.id);
      const existing = existingById.get(o.id);

      if (existing) {
        const existingRawHash = existing.get('rawHash');
        const existingIngestedAt = existing.get('ingestedAt');

        // Always bump lastSeenAt; only update other fields if payload changed
        if (existingRawHash && existingRawHash === o.rawHash) {
          // No changes, just update lastSeenAt
          batch.set(ref, { lastSeenAt: o.lastSeenAt }, { merge: true });
          skipped++;
        } else {
          // Payload changed, update everything but preserve ingestedAt
          const payload: Partial<NormalizedOpportunity> = {
            ...o,
            ingestedAt: existingIngestedAt ?? o.ingestedAt,
          };
          batch.set(ref, payload, { merge: true });
          upserted++;
        }
      } else {
        // New doc - set everything including ingestedAt
        batch.set(ref, o, { merge: false });
        upserted++;
      }

      opsInBatch++;
      if (opsInBatch >= 450) {
        await batch.commit();
        batch = db.batch();
        opsInBatch = 0;
      }
    }

    if (opsInBatch > 0) {
      await batch.commit();
    }
  }

  return { upserted, skipped };
}

/**
 * Log ingestion failures to Firestore
 */
async function logFailure(source: string, error: unknown): Promise<void> {
  const db = getAdminFirestore();
  const now = admin.firestore.Timestamp.now();
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack ?? '' : '';

  await db.collection(LOGS_COLLECTION).add({
    source,
    createdAt: now,
    message,
    stack: stack.slice(0, 8000), // Firestore string limit
  });
}

// ============================================================================
// MAIN INGESTION ORCHESTRATION
// ============================================================================

/**
 * Ingest opportunities from configured sources
 * 
 * @param sourceFilter Optional array of source names to filter (e.g., ['grantsGov', 'samGov'])
 *                     If not provided, all sources will be ingested
 */
export async function ingestAllSources(sourceFilter?: string[]): Promise<{
  totalFetched: number;
  totalUpserted: number;
  totalSkipped: number;
  sourcesProcessed: string[];
  sourcesSkipped: string[];
  sourcesFailed: string[];
  debug?: {
    allSources: string[];
    sourcesConfig: SourceConfig[];
  };
}> {
  const allSources = getSources();
  
  // Debug logging
  logger.info(`[Ingestion] Total sources configured: ${allSources.length}`);
  if (allSources.length > 0) {
    logger.info(`[Ingestion] Available sources: ${allSources.map(s => s.source).join(', ')}`);
  } else {
    logger.warn('[Ingestion] No sources configured. Set SOURCES_JSON secret or env var.');
    return {
      totalFetched: 0,
      totalUpserted: 0,
      totalSkipped: 0,
      sourcesProcessed: [],
      sourcesSkipped: [],
      sourcesFailed: [],
      debug: {
        allSources: [],
        sourcesConfig: [],
      },
    };
  }

  // Filter sources if filter provided
  let sources = allSources;
  if (sourceFilter && sourceFilter.length > 0) {
    const filterLower = sourceFilter.map(s => s.toLowerCase());
    sources = allSources.filter(s => filterLower.includes(s.source.toLowerCase()));
    logger.info(`[Ingestion] Filtered to ${sources.length} sources: ${sources.map(s => s.source).join(', ')}`);
    
    const skipped = allSources.filter(s => !filterLower.includes(s.source.toLowerCase()));
    if (skipped.length > 0) {
      logger.info(`[Ingestion] Skipped sources: ${skipped.map(s => s.source).join(', ')}`);
    }
  }

  if (!sources.length) {
    logger.warn('[Ingestion] No sources match the filter.');
    return {
      totalFetched: 0,
      totalUpserted: 0,
      totalSkipped: 0,
      sourcesProcessed: [],
      sourcesSkipped: allSources.map(s => s.source),
      sourcesFailed: [],
      debug: {
        allSources: allSources.map(s => s.source),
        sourcesConfig: allSources,
      },
    };
  }

  const now = admin.firestore.Timestamp.now();
  let totalFetched = 0;
  let totalUpserted = 0;
  let totalSkipped = 0;
  const sourcesProcessed: string[] = [];
  const sourcesFailed: string[] = [];

  for (const source of sources) {
    try {
      logger.info(`[Ingestion] Starting source=${source.source}`);
      const items = await fetchAllItemsForSource(source);
      totalFetched += items.length;

      logger.info(
        `[Ingestion] Fetched ${items.length} items from source=${source.source}`
      );

      const normalized = items.map((raw) =>
        normalizeOpportunity(raw, source, now)
      );
      const { upserted, skipped } = await upsertOpportunities(normalized);

      totalUpserted += upserted;
      totalSkipped += skipped;

      logger.info(
        `[Ingestion] Completed source=${source.source} ` +
          `fetched=${items.length} upserted=${upserted} skipped=${skipped}`
      );
      sourcesProcessed.push(source.source);
    } catch (e) {
      logger.error(`[Ingestion] Source failed source=${source.source}`, e);
      await logFailure(source.source, e);
      sourcesFailed.push(source.source);
    }
  }

  const sourcesSkipped = allSources
    .filter(s => !sources.map(s2 => s2.source).includes(s.source))
    .map(s => s.source);

  logger.info(
    `[Ingestion] All sources completed ` +
      `totalFetched=${totalFetched} totalUpserted=${totalUpserted} totalSkipped=${totalSkipped} ` +
      `processed=${sourcesProcessed.length} failed=${sourcesFailed.length}`
  );

  return {
    totalFetched,
    totalUpserted,
    totalSkipped,
    sourcesProcessed,
    sourcesSkipped,
    sourcesFailed,
    debug: {
      allSources: allSources.map(s => s.source),
      sourcesConfig: allSources.map(s => ({
        source: s.source,
        endpointUrl: s.endpointUrl,
        hasAuth: !!s.auth,
      })),
    },
  };
}

// ============================================================================
// EXPORTS (SCHEDULER + CALLABLE)
// ============================================================================

/**
 * Scheduled function: Runs daily at 3:15 AM America/New_York
 */
export const ingestOpportunitiesDaily = onSchedule(
  {
    schedule: '15 3 * * *', // 3:15 AM
    timeZone: 'America/New_York',
    retryCount: 1,
    memory: '1GiB',
    timeoutSeconds: 540, // 9 minutes
    secrets: [sourcesJsonSecret], // Access SOURCES_JSON secret
  },
  async () => {
    logger.info('[Ingestion] Daily scheduled ingestion started');
    const result = await ingestAllSources();
    logger.info('[Ingestion] Daily ingestion finished', result);
  }
);

/**
 * Callable function: Trigger ingestion manually (admin-only)
 * 
 * Requires Firebase Auth with custom claim: admin === true
 */
export const ingestOpportunitiesNow = onCall(
  {
    timeoutSeconds: 540, // 9 minutes
    memory: '1GiB',
    secrets: [sourcesJsonSecret], // Access SOURCES_JSON secret
  },
  async (req) => {
    // Admin-only: require Firebase Auth and custom claim admin==true
    if (!req.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }
    const isAdmin = (req.auth.token as any)?.admin === true;
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Admin only.');
    }

    logger.info('[Ingestion] Manual ingestion triggered by admin');
    const result = await ingestAllSources();
    return result;
  }
);

/**
 * HTTP function: Trigger ingestion via curl/HTTP request
 * 
 * Usage:
 *   curl -X POST https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp
 * 
 * Optional: Add ?token=YOUR_SECRET_TOKEN for basic auth protection
 * Set INGESTION_API_TOKEN environment variable to enable token-based auth
 * 
 * Note: If INGESTION_API_TOKEN env var is not set, the endpoint is open (no auth required)
 * For production, set the token as a secret: firebase functions:secrets:set INGESTION_API_TOKEN
 */
export const ingestOpportunitiesHttp = onRequest(
  {
    timeoutSeconds: 540, // 9 minutes
    memory: '1GiB',
    secrets: [sourcesJsonSecret], // Only include SOURCES_JSON secret
    cors: true, // Allow CORS for web requests
  },
  async (req, res) => {
    // Optional: Check for API token if env var is set
    const expectedToken = process.env.INGESTION_API_TOKEN;
    if (expectedToken && expectedToken.trim() !== '') {
      const providedToken = req.query.token || req.headers['x-api-token'];
      if (!providedToken || providedToken !== expectedToken) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or missing API token. Provide ?token=YOUR_TOKEN or X-API-Token header.',
        });
        return;
      }
    }

    // Allow GET for debugging, POST for execution
    if (req.method === 'GET') {
      // GET request: Show available sources and debug info
      const allSources = getSources();
      res.status(200).json({
        message: 'Use POST to trigger ingestion. Available sources:',
        availableSources: allSources.map(s => s.source),
        sourcesConfig: allSources.map(s => ({
          source: s.source,
          endpointUrl: s.endpointUrl,
          hasAuth: !!s.auth,
        })),
        usage: {
          allSources: 'POST /ingestOpportunitiesHttp',
          filterSources: 'POST /ingestOpportunitiesHttp?sources=grantsGov,samGov',
          withToken: 'POST /ingestOpportunitiesHttp?token=YOUR_TOKEN&sources=grantsGov',
        },
      });
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({
        error: 'Method Not Allowed',
        message: 'Only GET (debug) and POST (execute) requests are allowed.',
        allowedMethods: ['GET', 'POST'],
      });
      return;
    }

    try {
      // Parse source filter from query parameter
      const sourcesParam = req.query.sources || req.query.source;
      let sourceFilter: string[] | undefined;
      
      if (sourcesParam) {
        if (typeof sourcesParam === 'string') {
          sourceFilter = sourcesParam.split(',').map(s => s.trim()).filter(Boolean);
        } else if (Array.isArray(sourcesParam)) {
          sourceFilter = sourcesParam.map(s => String(s).trim()).filter(Boolean);
        }
        logger.info(`[Ingestion] HTTP ingestion triggered with source filter: ${sourceFilter?.join(', ')}`);
      } else {
        logger.info('[Ingestion] HTTP ingestion triggered (all sources)');
      }

      const result = await ingestAllSources(sourceFilter);

      res.status(200).json({
        success: true,
        message: 'Ingestion completed',
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('[Ingestion] HTTP ingestion failed', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message || 'Ingestion failed',
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }
  }
);
