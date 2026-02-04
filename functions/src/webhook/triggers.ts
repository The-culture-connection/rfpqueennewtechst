/**
 * Webhook trigger handlers
 * These functions are called by Firestore triggers to emit webhook events
 */

import { buildEvent } from './buildEvent';
import { getActiveIntegrations } from './integrations';
import { deliverWebhook } from './deliver';
import { logWebhookDelivery } from './logDelivery';
import { generateSignedDownloadUrl, parseStorageUrl } from './storageLinks';
import { chunkArray, calculateTotalPages } from './chunking';
import * as logger from 'firebase-functions/logger';
import { STATUS } from './mappings';

// Re-export emitWebhook for use in index.ts
export async function emitWebhook(
  eventType: string,
  data: Record<string, any>,
  metadata?: {
    userId?: string;
    opportunityId?: string;
    documentId?: string;
  }
): Promise<void> {
  try {
    const integrations = await getActiveIntegrations(
      eventType as any
    );
    if (integrations.length === 0) {
      logger.info(`No active integrations for event type: ${eventType}`);
      return;
    }

    const event = buildEvent(eventType as any, data);

    // Deliver to all integrations in parallel
    await Promise.all(
      integrations.map(async (integration) => {
        const result = await deliverWebhook(integration, event);
        await logWebhookDelivery(
          integration.id,
          event.id,
          eventType as any,
          result,
          metadata
        );
      })
    );
  } catch (error: any) {
    logger.error(`Error emitting webhook ${eventType}:`, error);
  }
}

const DEFAULT_CHUNK_SIZE = 25;


/**
 * User created webhook
 */
export async function handleUserCreated(
  userId: string,
  userData: FirebaseFirestore.DocumentData
): Promise<void> {
  // Only emit on creation (not updates)
  // Check if this is a new user by checking createdAt
  const createdAt = userData.createdAt;
  if (!createdAt) {
    return; // Not a new user
  }

  // Extract minimal user data (same fields used in dashboard)
  const userPayload = {
    userId,
    email: userData.email || '',
    entityName: userData.entityName || '',
    entityType: userData.entityType || '',
    fundingType: userData.fundingType || [],
    interestsMain: userData.interestsMain || [],
    createdAt: createdAt.toDate ? createdAt.toDate().toISOString() : createdAt,
  };

  await emitWebhook('user.created', userPayload, { userId });
}

/**
 * Document uploaded webhook
 */
export async function handleDocumentUploaded(
  userId: string,
  documentId: string,
  documentData: FirebaseFirestore.DocumentData
): Promise<void> {
  // Only emit when processingStatus becomes 'completed'
  if (documentData.processingStatus !== STATUS.PROCESSING_COMPLETED) {
    return;
  }

  // Generate signed download URL
  let downloadUrl = '';
  let expiresAt = '';
  const storageUrl = documentData.storageUrl;
  if (storageUrl) {
    try {
      const parsed = parseStorageUrl(storageUrl);
      if (parsed) {
        const signed = await generateSignedDownloadUrl(
          parsed.bucket,
          parsed.objectPath
        );
        downloadUrl = signed.downloadUrl;
        expiresAt = signed.expiresAt;
      }
    } catch (error: any) {
      logger.error('Error generating signed URL:', error);
    }
  }

  const documentPayload = {
    userId,
    documentId,
    fileName: documentData.fileName || '',
    contentType: documentData.fileType || '',
    documentType: documentData.documentType || '',
    fileSize: documentData.fileSize || 0,
    storagePath: storageUrl || '',
    downloadUrl,
    expiresAt,
    uploadedAt: documentData.uploadedAt || new Date().toISOString(),
  };

  await emitWebhook('document.uploaded', documentPayload, {
    userId,
    documentId,
  });
}

/**
 * Opportunity saved webhook
 */
export async function handleOpportunitySaved(
  userId: string,
  opportunity: any
): Promise<void> {
  // Extract analysis scores from opportunity object
  const analysisScores = {
    winRate: opportunity.winRate || 0,
    matchScore: opportunity.matchScore || 0,
    rankingScore: opportunity.matchScore || opportunity.winRate || 0,
    confidenceScore: opportunity.matchReasoning?.confidenceScore || 0,
    eligibilityStatus: opportunity.eligibilityStatus || 'unknown',
    eligibilityBlockers: opportunity.eligibilityBlockers || [],
  };

  const payload = {
    userId,
    opportunityId: opportunity.id || '',
    opportunity: opportunity, // Full opportunity object (UI schema)
    savedAt: opportunity.savedAt || new Date().toISOString(),
    analysisScores: analysisScores, // Explicitly include analysis scores
  };

  await emitWebhook('opportunity.saved', payload, {
    userId,
    opportunityId: opportunity.id,
  });
}

/**
 * Opportunity applied webhook
 */
export async function handleOpportunityApplied(
  userId: string,
  opportunity: any
): Promise<void> {
  // Extract analysis scores from opportunity object
  const analysisScores = {
    winRate: opportunity.winRate || 0,
    matchScore: opportunity.matchScore || 0,
    rankingScore: opportunity.matchScore || opportunity.winRate || 0,
    confidenceScore: opportunity.matchReasoning?.confidenceScore || 0,
    eligibilityStatus: opportunity.eligibilityStatus || 'unknown',
    eligibilityBlockers: opportunity.eligibilityBlockers || [],
  };

  const payload = {
    userId,
    opportunityId: opportunity.id || '',
    opportunity: opportunity, // Full opportunity object (UI schema)
    appliedAt: opportunity.appliedAt || new Date().toISOString(),
    analysisScores: analysisScores, // Explicitly include analysis scores
  };

  await emitWebhook('opportunity.applied', payload, {
    userId,
    opportunityId: opportunity.id,
  });
}

/**
 * Opportunity passed webhook
 */
export async function handleOpportunityPassed(
  userId: string,
  opportunityId: string,
  opportunityData: any
): Promise<void> {
  const payload = {
    userId,
    opportunityId: opportunityId,
    opportunity: opportunityData, // Opportunity data from passed document
    passedAt: opportunityData.passedAt || new Date().toISOString(),
  };

  await emitWebhook('opportunity.passed', payload, {
    userId,
    opportunityId: opportunityId,
  });
}

/**
 * Opportunity outcome recorded webhook (won/lost)
 */
export async function handleOpportunityOutcomeRecorded(
  userId: string,
  opportunityId: string,
  opportunity: any
): Promise<void> {
  // Extract analysis scores from opportunity object
  const analysisScores = {
    winRate: opportunity.winRate || 0,
    matchScore: opportunity.matchScore || 0,
    rankingScore: opportunity.matchScore || opportunity.winRate || 0,
    confidenceScore: opportunity.matchReasoning?.confidenceScore || 0,
    eligibilityStatus: opportunity.eligibilityStatus || 'unknown',
    eligibilityBlockers: opportunity.eligibilityBlockers || [],
  };

  const payload = {
    userId,
    opportunityId: opportunityId,
    outcome: opportunity.outcome, // 'won' | 'lost'
    opportunity: opportunity, // Full opportunity object
    recordedAt: opportunity.outcomeRecordedAt || new Date().toISOString(),
    notes: opportunity.outcomeNotes || '',
    analysisScores: analysisScores, // Explicitly include analysis scores
  };

  await emitWebhook('opportunity.outcome_recorded', payload, {
    userId,
    opportunityId: opportunityId,
  });
}

/**
 * Opportunity viewed webhook
 */
export async function handleOpportunityViewed(
  userId: string,
  opportunityId: string,
  opportunityData: any
): Promise<void> {
  const payload = {
    userId,
    opportunityId: opportunityId,
    opportunity: opportunityData.opportunity || {}, // Opportunity object
    viewedAt: opportunityData.viewedAt || new Date().toISOString(),
  };

  await emitWebhook('opportunity.viewed', payload, {
    userId,
    opportunityId: opportunityId,
  });
}

/**
 * Opportunities recommended webhook (chunked)
 * Note: opportunities parameter contains TopMatch objects, not full Opportunity objects
 * We need to fetch full opportunity data from source collections
 */
export async function handleOpportunitiesRecommended(
  userId: string,
  runId: string,
  matches: any[] // Array of TopMatch objects
): Promise<void> {
  if (matches.length === 0) {
    return;
  }

  // Fetch full opportunity objects from their source collections
  // TopMatch has opportunityId, we need to find the full opportunity
  // For now, we'll construct a minimal opportunity from the match data
  // In production, you'd fetch from: grants.gov, rfpmart, SAM, etc. collections

  const opportunities = matches.map((match) => {
    // Construct opportunity object from match data (UI schema)
    // This is a simplified version - in production, fetch full opp from source
    return {
      id: match.opportunityId,
      source: match.source || 'unknown',
      // Include all match data that maps to opportunity fields
      winRate: match.scores?.rankingScore || 0,
      matchScore: match.scores?.rankingScore || 0,
      eligibilityStatus: match.eligibility?.status || 'unknown',
      eligibilityBlockers: match.eligibility?.blockers || [],
      eligibilityEvidence: match.eligibility?.evidence || [],
      matchReasoning: {
        summary: match.notes?.matchSummary || '',
        strengths: [],
        concerns: [],
        specificReasons: match.eligibility?.reasons || [],
        eligibilityHighlights: match.notes?.eligibilityNotes || [],
        confidenceScore: match.confidenceScore || 0,
      },
      // Note: Full opportunity fields (title, description, etc.) should be fetched
      // from source collections. For now, we include what we have in the match.
      ...match.opportunity, // If match includes full opportunity, use it
    };
  });

  const chunks = chunkArray(opportunities, DEFAULT_CHUNK_SIZE);
  const totalPages = calculateTotalPages(opportunities.length, DEFAULT_CHUNK_SIZE);

  // Emit one webhook per chunk
  await Promise.all(
    chunks.map(async (chunk, index) => {
      const page = index + 1;
      const batchId = `${runId}_page_${page}`;

      const payload = {
        userId,
        runId,
        batchId,
        page,
        totalPages,
        items: chunk.map((opp) => ({
          opportunityId: opp.id || '',
          externalId: opp.id || '',
          source: opp.source || '',
          opportunity: opp, // Full Opportunity object (UI schema)
        })),
      };

      await emitWebhook('opportunities.recommended', payload, { userId });
    })
  );
}
