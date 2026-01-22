// Type definitions for the RFP Matcher application

export type FundingType = 'grants' | 'rfps' | 'contracts' | 'accelerators' | 'investors';
export type Timeline = 'immediate' | '3-months' | '6-months' | '12-months';
export type EntityType = 'nonprofit' | 'for-profit' | 'government' | 'education' | 'individual';
export type Interest = 
  | 'healthcare' 
  | 'education' 
  | 'environment' 
  | 'arts' 
  | 'technology' 
  | 'social-services' 
  | 'research' 
  | 'infrastructure' 
  | 'economic-development' 
  | 'housing';

export interface BusinessProfile {
  companyOverview?: string;
  mission?: string;
  vision?: string;
  servicesCapabilities?: string[];
  pastPerformance?: string[];
  teamExperience?: string[];
  approachMethodology?: string;
  pricingModel?: string;
  certifications?: string[];
  problemStatementExamples?: string[];
  proposedSolutionExamples?: string[];
  outcomesImpact?: string[];
  keywords?: string[];
  lastUpdated?: string;
}

export interface UserPreferences {
  passedOpportunityIds?: string[];
  savedOpportunityIds?: string[];
  appliedOpportunityIds?: string[];
  passPatterns?: {
    keywords?: string[];  // Keywords frequently in passed opportunities
    agencies?: string[];  // Agencies frequently passed
    amounts?: string[];   // Amount ranges frequently passed
  };
  savePatterns?: {
    keywords?: string[];  // Keywords frequently in saved opportunities
    agencies?: string[];  // Agencies frequently saved
    amounts?: string[];   // Amount ranges frequently saved
  };
  lastAnalyzed?: Date;
}

export interface UserProfile {
  uid: string;
  email: string;
  entityName: string;
  entityType: EntityType;
  fundingType: FundingType[];
  timeline: Timeline;
  interestsMain: Interest[];
  grantsByInterest: Interest[];
  keywords?: string[]; // Keywords extracted from documents or manually added
  positiveKeywords?: string[]; // User-defined keywords to prioritize/include more (priorityKeywords)
  negativeKeywords?: string[]; // User-defined keywords to omit/exclude
  businessProfile?: BusinessProfile;  // Extracted from executive summary/documents
  preferences?: UserPreferences;  // Learning from user behavior
  termsAccepted?: boolean; // Whether user has accepted terms and conditions
  termsAcceptedAt?: string; // ISO timestamp of when terms were accepted
  termsVersion?: string; // Version of terms that were accepted
  createdAt: Date;
  updatedAt: Date;
  
  // NEW: Version tracking for matching system
  profileVersion?: number; // Increments on profile/doc changes
  docsVersion?: number; // Increments on document upload/update
  lastMatchRun?: string; // ISO timestamp
  lastMatchProfileVersion?: number;
  lastMatchDocsVersion?: number;
  
  // NEW: Additional profile fields for enhanced matching
  overview?: string; // Company/organization overview
  capabilities?: string[]; // Core capabilities
  geography?: string[]; // Geographic focus areas
  has501c3?: boolean; // Nonprofit 501c3 status
  timelinePreferenceDays?: number; // Converted from Timeline enum to days
}

export interface FitScoreComponents {
  eligibilityFit: number;      // 0-1: Hard eligibility filter (org type, location, etc.)
  interestKeywordFit: number;  // 0-1: How well interests match
  structureFit: number;        // 0-1: Org structure match
  populationFit: number;      // 0-1: Population served match
  amountFit: number;          // 0-1: Funding amount match
  timingFit: number;          // 0-1: Timeline match
  businessProfileFit: number; // 0-1: How well business profile matches opportunity
  capabilityFit: number;      // 0-1: Services/capabilities alignment
  experienceFit: number;      // 0-1: Past performance and team experience match
  missionFit: number;         // 0-1: Mission/vision alignment with opportunity
  userPreferenceFit: number;  // 0-1: Based on past saves/passes
}

export interface MatchReasoning {
  summary: string;
  strengths: string[];
  concerns: string[];
  specificReasons: string[];
  eligibilityHighlights: string[];
  confidenceScore: number;  // 0-100: How confident we are in this match
}

export interface Opportunity {
  id: string;
  source: string;
  title: string;
  agency: string;
  description: string;
  openDate: string | null;
  closeDate: string | null;
  deadline?: string;
  responseDeadline?: string;
  city: string;
  state: string;
  contactEmail: string;
  url: string;
  amount?: string;
  category?: string;
  rfpNumber?: string;
  type: 'RFP' | 'Grant';
  
  // Structured eligibility fields (from Grants.gov, SAM.gov APIs)
  eligibleEntities?: string[]; // e.g., ['for-profit', 'nonprofit', 'state governments']
  fundingActivityCategories?: string[]; // e.g., ['education', 'health', 'SBIR']
  applicantTypes?: string[]; // e.g., ['individual', 'nonprofit', 'small business']
  naicsCodes?: string[]; // NAICS industry codes
  
  // NEW: Enrichment fields
  normalizedText?: string; // Precomputed searchable blob
  details?: {
    eligibilityText?: string;
    requirementsText?: string;
    geography?: string[];
    burdenSignals?: string[]; // e.g., ['high-reporting', 'complex-application']
    programMechanism?: string; // e.g., 'research', 'service-delivery', 'capacity-building'
  };
  sourceUrl?: string; // Original source URL
  synopsisUrl?: string; // Synopsis/details URL if different from sourceUrl
  fetchedAt?: string; // ISO timestamp when opportunity was fetched
  
  // NEW: Eligibility data quality tracking
  eligibilityDataQuality?: {
    hasEligibleEntities: boolean;
    hasApplicantTypes: boolean;
    hasCloseDate: boolean;
    hasSufficientDescription: boolean; // >= 100 chars
    isRollingDeadline: boolean;
    qualityScore: number; // 0..1
    missingFields: string[];
  };
  
  // Calculated fields
  winRate?: number;
  timeBucket?: Timeline;
  matchScore?: number;
  fitComponents?: FitScoreComponents; // Detailed fit scores for match reasoning
  matchReasoning?: MatchReasoning;  // AI-generated personalized reasoning
  personalizedDescription?: string; // Tailored description highlighting eligibility
  eligibilityNotes?: string[]; // Detailed eligibility notes from AI refinement
  
  // NEW: Eligibility status fields (from fail-closed evaluation)
  eligibilityStatus?: 'eligible' | 'ineligible' | 'unknown';
  eligibilityBlockers?: string[]; // e.g., ["missing_applicant_types", "entity_type_mismatch"]
  eligibilityEvidence?: Array<{ field: string; value: any; source: string }>;
}

export interface SavedOpportunity {
  opportunityId: string;
  opportunity: Opportunity;
  status: 'saved' | 'applied' | 'skipped';
  savedAt: Date;
  notes?: string;
}

export interface OpportunityTracker {
  saved: SavedOpportunity[];
  applied: SavedOpportunity[];
  skipped: string[]; // Just IDs for skipped
}

// Onboarding step data
export interface OnboardingData {
  step: number;
  fundingTypes?: FundingType[];
  timeline?: Timeline;
  interests?: Interest[];
  entityName?: string;
  entityType?: EntityType;
}

// NEW: Match Run Data Model
export type MatchTrigger = 'FIRST_DASHBOARD' | 'DOCS_UPLOAD' | 'RERUN_BUTTON';

export interface EligibilityGate {
  eligible: boolean; // DEPRECATED: Use eligibility.status === "eligible" instead
  reasons: string[]; // Why eligible or not
  eligibilityScore: number; // 0-1 confidence in eligibility
}

// NEW: Fail-closed eligibility evaluation result
export interface EligibilityEvaluation {
  status: 'eligible' | 'ineligible' | 'unknown';
  eligible: boolean; // Derived: status === "eligible"
  blockers: string[]; // e.g., ["missing_applicant_types", "entity_type_mismatch", "deadline_passed"]
  reasons: string[]; // Human-readable explanations
  evidence: Array<{
    field: string; // e.g., "applicantTypes", "closeDate"
    value: any; // Actual value found
    source: string; // Where value came from: "api", "description", "enriched", "assumed"
  }>;
  eligibilityScore: number; // 0..1, only meaningful if status is "eligible" or "unknown"
}

export interface MatchScores {
  fitScore: number; // 0-1: Mission/keyword alignment
  effortScore: number; // 0-1: Application burden (higher = easier)
  eligibilityScore: number; // 0-1: Eligibility confidence
  rankingScore: number; // 0-100: Final ranking score
}

export interface MatchNotes {
  eligibilityNotes: string[]; // Detailed eligibility explanations
  matchSummary: string; // Brief match summary
}

export interface MatchDebug {
  matchedKeywords: string[]; // Keywords that matched
  timeScore: number; // Timeline match score
  gatesTriggered: string[]; // Which eligibility gates were checked
  dataQualityScore: number; // 0..1, from opportunity.eligibilityDataQuality.qualityScore
}

export interface TopMatch {
  opportunityId: string;
  eligibilityGate: EligibilityGate; // DEPRECATED: Use eligibility instead
  eligibility: EligibilityEvaluation; // NEW: Fail-closed eligibility evaluation
  scores: MatchScores;
  notes: MatchNotes;
  confidenceScore: number; // 0-100
  debug: MatchDebug;
}

export interface MatchRun {
  runId: string;
  createdAt: string; // ISO timestamp
  trigger: MatchTrigger;
  profileVersionUsed: number;
  docsVersionUsed: number;
  algorithmVersion: string;
  topMatches: TopMatch[]; // All matches (eligible + unknown + ineligible for audit)
  status: 'complete' | 'running' | 'error';
  error?: string;
  runStats?: {
    totalConsidered: number;
    eligibleCount: number;
    unknownCount: number;
    ineligibleCount: number;
    missingFieldCounts: {
      applicantTypes: number;
      eligibleEntities: number;
      closeDate: number;
      description: number;
    };
    topBlockers: Array<{ blocker: string; count: number }>;
  };
}

export interface CurrentMatches {
  runId: string;
  updatedAt: string; // ISO timestamp
  topMatches: TopMatch[]; // Possibly truncated - ONLY eligible matches
  unknownEligibilityMatches?: TopMatch[]; // NEW: Unknown eligibility bucket
  counts: {
    total: number;
    eligible: number;
    unknown: number; // NEW: Unknown eligibility count
    ineligible: number; // NEW: Ineligible count (for stats)
    highScore: number; // rankingScore >= threshold
  };
  runStats?: {
    totalConsidered: number;
    eligibleCount: number;
    unknownCount: number;
    ineligibleCount: number;
    missingFieldCounts: {
      applicantTypes: number;
      eligibleEntities: number;
      closeDate: number;
      description: number;
    };
    topBlockers: Array<{ blocker: string; count: number }>;
  };
}

// NEW: User Opportunity Signals
export interface UserOpportunitySignal {
  opportunityId: string;
  status: 'new' | 'passed' | 'saved' | 'applied';
  timestamps: {
    passedAt?: string;
    savedAt?: string;
    appliedAt?: string;
  };
  lastActionAt: string; // ISO timestamp
  runIdContext?: string; // Which match run suggested it
  userNotes?: string;
}

// NEW: Audit Log
export interface AuditLog {
  requestId: string;
  createdAt: string; // ISO timestamp
  userId: string;
  trigger: MatchTrigger | 'DOC_UPLOAD' | 'AI_REFINEMENT' | 'OTHER';
  payloadSnapshot?: any; // Sanitized
  responseSnapshot?: any; // Sanitized
  latencyMs?: number;
  tokenUsage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  modelParams?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
  };
  algorithmVersion?: string;
  error?: string;
}

// NEW: User Search Profile (for matching)
export interface UserSearchProfile {
  priorityKeywords: string[]; // Highest weight
  keywords: string[]; // Medium weight
  overview: string; // Company overview text
  capabilities: string[]; // Core capabilities
  interests: Interest[]; // Lowest weight
  tokens: string[]; // Tokenized keywords
  bigrams: string[]; // Bigram combinations
  synonyms: Map<string, string[]>; // Keyword synonyms
}

