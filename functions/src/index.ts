/**
 * Firebase Cloud Functions - Main Entry Point
 * Includes webhook triggers for Firestore changes
 */

import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { getAdminFirestore } from './webhook/firebaseAdmin';
import {
  handleUserCreated,
  handleDocumentUploaded,
  handleOpportunitySaved,
  handleOpportunityApplied,
  handleOpportunitiesRecommended,
  emitWebhook,
} from './webhook/triggers';
import { COLLECTIONS, FIELDS, STATUS } from './webhook/mappings';

// Set global options
setGlobalOptions({
  region: 'us-central1',
  maxInstances: 10,
});

const db = getAdminFirestore();

// ============================================================================
// WEBHOOK TRIGGERS
// ============================================================================

/**
 * User created trigger
 * Fires when profile/{uid} is created
 */
export const onUserCreated = onDocumentCreated('profiles/{userId}', async (event) => {
  const userId = event.params.userId;
  const snapshot = event.data;
  if (!snapshot) {
    return;
  }
  const userData = snapshot.data();

  logger.info(`[Webhook] User created: ${userId}`);
  await handleUserCreated(userId, userData);
});

/**
 * Document uploaded trigger - onCreate
 * Fires when document is first created with processingStatus 'completed'
 */
export const onDocumentUploadedCreate = onDocumentCreated('profiles/{userId}/documents/{documentId}', async (event) => {
  const userId = event.params.userId;
  const documentId = event.params.documentId;
  const snapshot = event.data;
  if (!snapshot) {
    return;
  }
  const after = snapshot.data();

  // Emit if created with 'completed' status
  if (after[FIELDS.PROCESSING_STATUS] === STATUS.PROCESSING_COMPLETED) {
    logger.info(
      `[Webhook] Document uploaded (onCreate): ${userId}/${documentId}`
    );
    await handleDocumentUploaded(userId, documentId, after);
  }
});

/**
 * Document uploaded trigger - onUpdate
 * Fires when processingStatus changes to 'completed'
 */
export const onDocumentUploadedUpdate = onDocumentUpdated('profiles/{userId}/documents/{documentId}', async (event) => {
  const userId = event.params.userId;
  const documentId = event.params.documentId;

  if (!event.data) {
    return;
  }

  const before = event.data.before.data();
  const after = event.data.after.data();

  // Only emit when processingStatus becomes 'completed'
  const beforeStatus = before[FIELDS.PROCESSING_STATUS];
  const afterStatus = after[FIELDS.PROCESSING_STATUS];

  if (
    afterStatus === STATUS.PROCESSING_COMPLETED &&
    beforeStatus !== STATUS.PROCESSING_COMPLETED
  ) {
    logger.info(
      `[Webhook] Document uploaded (onUpdate): ${userId}/${documentId}`
    );
    await handleDocumentUploaded(userId, documentId, after);
  }
});

/**
 * Opportunity saved trigger
 * Fires when profiles/{uid}/tracker/saved opportunities array is updated
 */
export const onOpportunitySaved = onDocumentUpdated('profiles/{userId}/tracker/saved', async (event) => {
  const userId = event.params.userId;
  
  if (!event.data) {
    return;
  }

  const before = event.data.before.data();
  const after = event.data.after.data();

  type OpportunityRef = { id: string; [k: string]: any };
  const beforeOpps: OpportunityRef[] = (before[FIELDS.OPPORTUNITIES] ?? []) as OpportunityRef[];
  const afterOpps: OpportunityRef[] = (after[FIELDS.OPPORTUNITIES] ?? []) as OpportunityRef[];

  // Find newly added opportunities
  const beforeIds = new Set<string>(beforeOpps.map((opp) => opp.id));
  const newOpportunities = afterOpps.filter(
    (opp) => !beforeIds.has(opp.id)
  );

  for (const opp of newOpportunities) {
    logger.info(
      `[Webhook] Opportunity saved: ${userId}/${opp.id}`
    );
    await handleOpportunitySaved(userId, opp);
  }
});

/**
 * Opportunity applied trigger
 * Fires when profiles/{uid}/tracker/applied opportunities array is updated
 */
export const onOpportunityApplied = onDocumentUpdated('profiles/{userId}/tracker/applied', async (event) => {
  const userId = event.params.userId;
  
  if (!event.data) {
    return;
  }

  const before = event.data.before.data();
  const after = event.data.after.data();

  type OpportunityRef = { id: string; [k: string]: any };
  const beforeOpps: OpportunityRef[] = (before[FIELDS.OPPORTUNITIES] ?? []) as OpportunityRef[];
  const afterOpps: OpportunityRef[] = (after[FIELDS.OPPORTUNITIES] ?? []) as OpportunityRef[];

  // Find newly added opportunities
  const beforeIds = new Set<string>(beforeOpps.map((opp) => opp.id));
  const newOpportunities = afterOpps.filter(
    (opp) => !beforeIds.has(opp.id)
  );

  for (const opp of newOpportunities) {
    logger.info(
      `[Webhook] Opportunity applied: ${userId}/${opp.id}`
    );
    await handleOpportunityApplied(userId, opp);
  }
});

/**
 * Opportunity outcome recorded trigger
 * TODO: Implement when outcome tracking is added to the app
 * Expected path: profiles/{uid}/tracker/outcomes/{opportunityId}
 * or profiles/{uid}/opportunities/{opportunityId} with outcome field
 */
// export const onOpportunityOutcomeRecorded = functions.firestore
//   .document('profiles/{userId}/tracker/outcomes/{opportunityId}')
//   .onCreate(async (snapshot, context) => {
//     const userId = context.params.userId;
//     const opportunityId = context.params.opportunityId;
//     const outcomeData = snapshot.data();
//
//     logger.info(
//       `[Webhook] Opportunity outcome recorded: ${userId}/${opportunityId}`
//     );
//
//     const payload = {
//       userId,
//       opportunityId,
//       outcome: outcomeData.outcome, // 'won' | 'lost'
//       recordedAt: outcomeData.recordedAt || new Date().toISOString(),
//       notes: outcomeData.notes || '',
//     };
//
//     await emitWebhook('opportunity.outcome_recorded', payload, {
//       userId,
//       opportunityId,
//     });
//   });

/**
 * Opportunity analyzed trigger
 * Fires when scores/analysis are updated in currentMatches
 * This is a lightweight trigger that fires on score changes
 */
export const onOpportunityAnalyzed = onDocumentUpdated('userMatches/{userId}/current/latest', async (event) => {
  const userId = event.params.userId;
  
  if (!event.data) {
    return;
  }

  const before = event.data.before.data();
  const after = event.data.after.data();

  // Check if scores changed
  type MatchItem = { scores?: { rankingScore?: number }; [k: string]: any };
  const beforeMatches = (before[FIELDS.TOP_MATCHES] ?? []) as MatchItem[];
  const afterMatches = (after[FIELDS.TOP_MATCHES] ?? []) as MatchItem[];
  const beforeScores = beforeMatches.map((m) => m.scores?.rankingScore);
  const afterScores = afterMatches.map((m) => m.scores?.rankingScore);

  if (JSON.stringify(beforeScores) !== JSON.stringify(afterScores)) {
    logger.info(
      `[Webhook] Opportunity analyzed: ${userId} (scores updated)`
    );

    const payload = {
      userId,
      runId: after[FIELDS.RUN_ID],
      updatedAt: after[FIELDS.UPDATED_AT] || new Date().toISOString(),
      matchCount: afterMatches.length,
    };

    await emitWebhook('opportunity.analyzed', payload, { userId });
  }
});

/**
 * Opportunities recommended trigger
 * Fires when algorithm results are saved to userMatches/{uid}/current/latest
 * Only fires on creation (not updates) to avoid duplicate webhooks
 */
export const onOpportunitiesRecommended = onDocumentCreated('userMatches/{userId}/current/latest', async (event) => {
  const userId = event.params.userId;
  const snapshot = event.data;
  if (!snapshot) {
    return;
  }
  const data = snapshot.data();

  const runId = data[FIELDS.RUN_ID];
  const topMatches = data[FIELDS.TOP_MATCHES] || [];
  const unknownMatches = data[FIELDS.UNKNOWN_ELIGIBILITY_MATCHES] || [];
  const allMatches = [...topMatches, ...unknownMatches];

  if (!runId || allMatches.length === 0) {
    return;
  }

  logger.info(
    `[Webhook] Opportunities recommended: ${userId}/${runId} (${allMatches.length} matches)`
  );

  // Emit webhook with match data
  // The normalized persistence handler will store full opportunities
  await handleOpportunitiesRecommended(userId, runId, allMatches);
});

// ============================================================================
// NORMALIZED RECOMMENDATION PERSISTENCE
// ============================================================================

/**
 * When algorithm results are saved, also persist them in normalized structure
 * This runs as a side effect of the recommendation trigger
 * Stores full opportunity objects for webhook delivery
 */
export const persistRecommendations = onDocumentCreated('userMatches/{userId}/current/latest', async (event) => {
  const userId = event.params.userId;
  const snapshot = event.data;
  if (!snapshot) {
    return;
  }
  const data = snapshot.data();

    const runId = data[FIELDS.RUN_ID];
    const topMatches = data[FIELDS.TOP_MATCHES] || [];
    const unknownMatches = data[FIELDS.UNKNOWN_ELIGIBILITY_MATCHES] || [];
    const allMatches = [...topMatches, ...unknownMatches];

    if (!runId || allMatches.length === 0) {
      return;
    }

    try {
      // Save run summary
      const runRef = db
        .collection(COLLECTIONS.PROFILES)
        .doc(userId)
        .collection(COLLECTIONS.RECOMMENDATION_RUNS)
        .doc(runId);

      await runRef.set({
        userId,
        runId,
        createdAt: new Date().toISOString(),
        algorithmVersion: data.algorithmVersion || '2.0.0',
        totalCount: allMatches.length,
        eligibleCount: topMatches.length,
        unknownCount: unknownMatches.length,
        status: 'completed',
        ...(data.runStats ? { runStats: data.runStats } : {}),
      });

      // Save individual items
      const itemsRef = runRef.collection(COLLECTIONS.RECOMMENDATION_ITEMS);
      const batch = db.batch();

      for (const match of allMatches) {
        const itemId = match.opportunityId || `item_${Date.now()}_${Math.random()}`;
        const itemRef = itemsRef.doc(itemId);

        // Store match data with opportunityId
        // Full opportunity object will be constructed in webhook handler
        // from match data + source collections if needed
        batch.set(itemRef, {
          userId,
          runId,
          createdAt: new Date().toISOString(),
          opportunityId: match.opportunityId,
          externalId: match.opportunityId,
          source: match.source || 'unknown',
          // Store match data - webhook handler will construct full opportunity
          match: match,
        });
      }

      await batch.commit();

      logger.info(
        `[Webhook] Persisted ${allMatches.length} recommendations for ${userId}/${runId}`
      );
    } catch (error: any) {
      logger.error(
        `[Webhook] Error persisting recommendations: ${error.message}`
      );
    }
  });

// ============================================================================
// EXISTING FUNCTIONS
// ============================================================================
// 
// IMPORTANT: The existing functions (samGov, grantsGov, matchOpportunities, etc.)
// are currently in lib/index.js (compiled JavaScript). To preserve them:
//
// Option 1: If you have TypeScript source, merge them here and re-export
// Option 2: Keep lib/index.js as-is and use separate entry points
// Option 3: Import from lib/index.js at runtime (not recommended)
//
// See WEBHOOK_MIGRATION.md for details.
//
// For now, webhook functions are added alongside. Existing functions will
// continue to work from lib/index.js until you merge them.
