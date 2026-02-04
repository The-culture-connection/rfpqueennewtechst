/**
 * Generate stable, deterministic opportunity IDs
 * IDs must be consistent across API calls to enable matching
 */

import { createHash } from 'crypto';

/**
 * Generate a stable ID for an opportunity based on source and stable key
 * @param source - The source system (e.g., 'Grants.gov', 'Simpler.Grants.gov', 'SAM.gov')
 * @param stableKey - A stable identifier from the source (e.g., opportunity_id, noticeId, number)
 * @returns A deterministic ID string
 */
export function stableOpportunityId(source: string, stableKey: string | number | null | undefined): string {
  if (!stableKey) {
    throw new Error(`stableKey is required for source: ${source}`);
  }
  
  // Normalize source to lowercase with hyphens
  const normalizedSource = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  // Convert stableKey to string and normalize
  const normalizedKey = String(stableKey).toLowerCase().trim();
  
  // Combine: source-stablekey
  return `${normalizedSource}-${normalizedKey}`;
}

/**
 * Generate a stable ID for opportunities without a stable key (e.g., Google Search)
 * Uses a deterministic hash of stable fields
 */
export function stableOpportunityIdFromFields(
  source: string,
  title: string,
  url: string,
  agency?: string
): string {
  // Normalize source
  const normalizedSource = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  // Create a stable hash from title + url + agency
  const hashInput = `${title}|${url}|${agency || ''}`.toLowerCase().trim();
  const hash = createHash('sha256').update(hashInput).digest('hex').substring(0, 12);
  
  return `${normalizedSource}-${hash}`;
}
