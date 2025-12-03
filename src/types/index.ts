// Type definitions for the RFP Matcher application

export type FundingType = 'grants' | 'rfps' | 'contracts';
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
  positiveKeywords?: string[]; // User-defined keywords to prioritize/include more
  negativeKeywords?: string[]; // User-defined keywords to omit/exclude
  businessProfile?: BusinessProfile;  // Extracted from executive summary/documents
  preferences?: UserPreferences;  // Learning from user behavior
  createdAt: Date;
  updatedAt: Date;
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
  
  // Calculated fields
  winRate?: number;
  timeBucket?: Timeline;
  matchScore?: number;
  fitComponents?: FitScoreComponents; // Detailed fit scores for match reasoning
  matchReasoning?: MatchReasoning;  // AI-generated personalized reasoning
  personalizedDescription?: string; // Tailored description highlighting eligibility
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

