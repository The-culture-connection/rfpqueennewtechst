/**
 * Firestore path mappings and constants
 */

// Collection paths
export const COLLECTIONS = {
  PROFILES: 'profiles',
  DOCUMENTS: 'documents', // Subcollection: profiles/{uid}/documents
  TRACKER_SAVED: 'tracker', // Subcollection: profiles/{uid}/tracker, doc: 'saved'
  TRACKER_APPLIED: 'tracker', // Subcollection: profiles/{uid}/tracker, doc: 'applied'
  DASHBOARD_PASSED: 'dashboard', // Subcollection: profiles/{uid}/dashboard, doc: 'passed'
  USER_SIGNALS: 'userOpportunitySignals', // Collection: userOpportunitySignals/{uid}/signals
  MATCH_RUNS: 'userMatches', // Collection: userMatches/{uid}/runs
  CURRENT_MATCHES: 'userMatches', // Collection: userMatches/{uid}/current, doc: 'latest'
  RECOMMENDATION_RUNS: 'recommendationRuns', // Subcollection: profiles/{uid}/recommendationRuns
  RECOMMENDATION_ITEMS: 'items', // Subcollection: profiles/{uid}/recommendationRuns/{runId}/items
  INTEGRATIONS: 'integrations',
  WEBHOOK_DELIVERIES: 'webhookDeliveries',
} as const;

// Document field names
export const FIELDS = {
  PROCESSING_STATUS: 'processingStatus',
  STATUS: 'status',
  OPPORTUNITIES: 'opportunities',
  CURRENT_MATCHES: 'currentMatches',
  TOP_MATCHES: 'topMatches',
  UNKNOWN_ELIGIBILITY_MATCHES: 'unknownEligibilityMatches',
  RUN_ID: 'runId',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
} as const;

// Status values
export const STATUS = {
  PROCESSING_COMPLETED: 'completed',
  OPPORTUNITY_SAVED: 'saved',
  OPPORTUNITY_APPLIED: 'applied',
  OPPORTUNITY_PASSED: 'passed',
} as const;
