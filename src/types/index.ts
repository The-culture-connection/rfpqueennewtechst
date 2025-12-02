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
  createdAt: Date;
  updatedAt: Date;
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

