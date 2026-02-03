# Webhook System Implementation - Investigation Results

## Discovered Firestore Mappings

### User Profile Creation
- **Path**: `profiles/{uid}`
- **Trigger**: Document created (first write)
- **Fields**: `entityName`, `entityType`, `email`, `fundingType`, `interestsMain`, `createdAt`, etc.

### Document Uploads
- **Path**: `profiles/{uid}/documents/{docId}`
- **Trigger**: Document created OR `processingStatus` changed to `'completed'`
- **Fields**:
  - `fileName`, `fileType`, `fileSize`
  - `storageUrl` (public download URL - needs signed URL generation)
  - `processingStatus`: 'pending' | 'processing' | 'completed' | 'failed'
  - `documentType`: 'executive-summary' | '501c3' | etc.
  - `uploadedAt`: ISO string
- **Storage Path**: `Userdocuments/{uid}/{documentType}-{uuid}.{extension}`

### Opportunity Actions

#### Saved Opportunities
- **Path**: `profiles/{uid}/tracker/saved`
- **Structure**: Document with `opportunities` array
- **Trigger**: Array updated (new opportunity added)
- **Fields**: Full `Opportunity` object + `savedAt`, `status: 'saved'`

#### Applied Opportunities
- **Path**: `profiles/{uid}/tracker/applied`
- **Structure**: Document with `opportunities` array
- **Trigger**: Array updated (new opportunity added)
- **Fields**: Full `Opportunity` object + `appliedAt`, `status: 'applied'`

#### Passed Opportunities
- **Path**: `profiles/{uid}/dashboard/passed`
- **Structure**: Document with opportunity IDs as keys
- **Trigger**: New key added (opportunity passed)
- **Fields**: `{ [opportunityId]: { id, title, agency, source, passedAt, winRate } }`

#### User Signals (New System)
- **Path**: `userOpportunitySignals/{uid}/signals/{opportunityId}`
- **Trigger**: Document created/updated
- **Fields**: `opportunityId`, `status: 'passed' | 'saved' | 'applied'`, `timestamps`, `lastActionAt`

### Algorithm Results (Recommendations)

#### Match Runs (Full History)
- **Path**: `userMatches/{uid}/runs/{runId}`
- **Structure**: `MatchRun` type
- **Fields**:
  - `runId`, `createdAt`, `trigger`, `status`
  - `topMatches`: `TopMatch[]` (eligible + unknown)
  - `runStats`: statistics

#### Current Matches (Latest Results)
- **Path**: `userMatches/{uid}/current/latest`
- **Also**: `profiles/{uid}` with `currentMatches` field
- **Structure**: `CurrentMatches` type
- **Fields**:
  - `runId`, `updatedAt`
  - `topMatches`: `TopMatch[]` (eligible only, max 50)
  - `unknownEligibilityMatches`: `TopMatch[]` (unknown eligibility, max 50)
  - `counts`: { total, eligible, unknown, ineligible, highScore }
  - `runStats`: statistics

**Note**: Algorithm results are NOT currently persisted in a normalized per-item structure. They are stored as arrays in the run/current documents.

## Canonical UI Dashboard Opportunity Schema

The UI dashboard uses the `Opportunity` interface from `src/types/index.ts`. This is the canonical schema that must be sent via webhook:

```typescript
interface Opportunity {
  // Core fields
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
  
  // Eligibility fields
  eligibleEntities?: string[];
  fundingActivityCategories?: string[];
  applicantTypes?: string[];
  naicsCodes?: string[];
  
  // Enrichment
  normalizedText?: string;
  details?: {
    eligibilityText?: string;
    requirementsText?: string;
    geography?: string[];
    burdenSignals?: string[];
    programMechanism?: string;
  };
  sourceUrl?: string;
  synopsisUrl?: string;
  fetchedAt?: string;
  
  // Data quality
  eligibilityDataQuality?: {
    hasEligibleEntities: boolean;
    hasApplicantTypes: boolean;
    hasCloseDate: boolean;
    hasSufficientDescription: boolean;
    isRollingDeadline: boolean;
    qualityScore: number;
    missingFields: string[];
  };
  
  // Calculated/match fields
  winRate?: number;
  timeBucket?: Timeline;
  matchScore?: number;
  fitComponents?: FitScoreComponents;
  matchReasoning?: MatchReasoning;
  personalizedDescription?: string;
  eligibilityNotes?: string[];
  
  // Eligibility status (from fail-closed evaluation)
  eligibilityStatus?: 'eligible' | 'ineligible' | 'unknown';
  eligibilityBlockers?: string[];
  eligibilityEvidence?: Array<{ field: string; value: any; source: string }>;
}
```

**Critical**: When sending opportunities via webhook, include ALL fields that the UI dashboard displays. The `OpportunityCard` component uses:
- `title`, `agency`, `description`
- `winRate`, `matchScore`
- `closeDate`, `deadline`
- `amount`, `city`, `state`
- `url`, `source`, `type`
- `eligibilityStatus`, `eligibilityBlockers`, `eligibilityEvidence`
- `matchReasoning` (summary, strengths, concerns, specificReasons, eligibilityHighlights, confidenceScore)
- `fitComponents` (all sub-scores)

## Outcome Recording

**NOT FOUND**: The codebase does not currently record opportunity outcomes (won/lost). This would need to be implemented separately if required.

## Opportunity Views

**NOT FOUND**: The codebase tracks views via analytics (`trackOpportunityViewed`) but does not persist them as Firestore writes. Views are tracked in Firebase Analytics, not Firestore.

## Next Steps

1. Implement normalized recommendation persistence structure
2. Create webhook sender infrastructure
3. Implement Firestore triggers
4. Create local webhook receiver
