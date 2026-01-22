# Production-Grade Matching System Implementation

## Overview

This document describes the comprehensive upgrade to the RFP/Grant matching system, implementing a two-stage approach with eligibility gates, weighted ranking, version tracking, and user behavior signals.

## Files Changed

### New Files Created
1. **`src/lib/productionMatchAlgorithm.ts`** - New two-stage matching algorithm
   - Eligibility gates (hard filters)
   - Fit score calculation (mission/keyword alignment)
   - Effort score calculation (application burden)
   - Ranking score computation

2. **`src/lib/matchDataAccess.ts`** - Data access layer
   - `shouldRunMatching()` - Checks if matching should run
   - `saveMatchRun()` - Saves match run to Firestore
   - `getCurrentMatches()` - Retrieves current matches
   - `saveUserOpportunitySignal()` - Saves pass/save/apply signals
   - `incrementProfileVersion()` / `incrementDocsVersion()` - Version management
   - `migrateUserIfNeeded()` - Lazy migration for existing users

3. **`src/app/api/should-run-matching/route.ts`** - API endpoint to check if matching should run

4. **`src/app/api/run-matching/route.ts`** - API endpoint to execute matching
   - Fetches opportunities
   - Runs production matching algorithm
   - Optionally applies AI refinement
   - Saves results to Firestore
   - Logs audit events

5. **`src/app/api/user-signal/route.ts`** - API endpoint for pass/save/apply signals

6. **`src/hooks/useProductionOpportunities.ts`** - New hook for production matching (optional, can be integrated)

7. **`FIRESTORE_INDEXES.md`** - Firestore index documentation

### Modified Files
1. **`src/types/index.ts`** - Added new types:
   - `MatchTrigger`, `EligibilityGate`, `MatchScores`, `MatchNotes`, `MatchDebug`, `TopMatch`
   - `MatchRun`, `CurrentMatches`, `UserOpportunitySignal`, `AuditLog`
   - `UserSearchProfile`
   - Extended `UserProfile` with version tracking fields
   - Extended `Opportunity` with enrichment fields

2. **`src/components/AuthProvider.tsx`** - Updated to increment `profileVersion` on profile updates

3. **`src/app/api/extract-document/route.ts`** - Updated to increment `docsVersion` on document upload

4. **`src/app/dashboard/page.tsx`** - Updated pass/save/apply handlers to use new API

5. **`src/hooks/useOpportunities.ts`** - Updated to check `shouldRunMatching` and use new system when needed

## New Data Model

### Firestore Collections

#### `users/{uid}` (or `profiles/{uid}` for backward compatibility)
```typescript
{
  // Existing profile fields...
  profileVersion: number,        // Increments on profile/doc changes
  docsVersion: number,           // Increments on doc upload/update
  lastMatchRun: timestamp,       // Last time matching ran
  lastMatchProfileVersion: number,
  lastMatchDocsVersion: number,
}
```

#### `userMatches/{uid}/runs/{runId}`
```typescript
{
  runId: string,
  createdAt: timestamp,
  trigger: 'FIRST_DASHBOARD' | 'DOCS_UPLOAD' | 'RERUN_BUTTON',
  profileVersionUsed: number,
  docsVersionUsed: number,
  algorithmVersion: string,
  topMatches: TopMatch[],
  status: 'complete' | 'running' | 'error',
  error?: string,
}
```

#### `userMatches/{uid}/current/latest`
```typescript
{
  runId: string,
  updatedAt: timestamp,
  topMatches: TopMatch[],  // Top 50
  counts: {
    total: number,
    eligible: number,
    highScore: number,
  },
}
```

#### `userOpportunitySignals/{uid}/signals/{opportunityId}`
```typescript
{
  opportunityId: string,
  status: 'new' | 'passed' | 'saved' | 'applied',
  timestamps: {
    passedAt?: timestamp,
    savedAt?: timestamp,
    appliedAt?: timestamp,
  },
  lastActionAt: timestamp,
  runIdContext?: string,
  userNotes?: string,
}
```

#### `Ai api audit/{requestId}` (existing, enhanced)
- Already implemented with audit logging
- Now includes `algorithmVersion` field

## Matching Execution Rules

Matching runs ONLY when:
1. **FIRST_DASHBOARD**: User has no current matches (`userMatches/{uid}/current` doesn't exist)
2. **DOCS_UPLOAD**: `profileVersion` or `docsVersion` changed since last match run
3. **RERUN_BUTTON**: User explicitly clicks "Rerun Matching" (forced run)

The `shouldRunMatching()` function checks these conditions server-side.

## Matching Algorithm

### Stage 1: Eligibility Gates (Hard Filters)
1. **Funding Type Gate**: Opportunity type must match user's funding types
2. **Entity Type Gate**: Applicant types must be compatible with user's entity type
3. **Timeline Gate**: Deadline must be within acceptable range (based on `timelinePreferenceDays`)
4. **Program Mechanism Gate**: Filters research-heavy mechanisms for non-research orgs
5. **Geography Gate**: Soft penalty for location mismatch (if geography data exists)

### Stage 2: Ranking Score
Formula: `rankingScore = 100 * (0.55*eligibilityScore + 0.35*fitScore + 0.10*effortScore)`

- **eligibilityScore** (55% weight): Confidence in eligibility (0-1)
- **fitScore** (35% weight): Mission/keyword alignment (0-1)
  - Priority keywords: 40%
  - Regular keywords: 30%
  - Bigrams: 20%
  - Overview/capabilities: 10%
- **effortScore** (10% weight): Application burden (lower burden = higher score)

### Filtering
- Opportunities with `eligible == false` get `rankingScore = 0`
- Opportunities with `rankingScore < 35` are filtered out
- Top 50 opportunities are returned, sorted by `rankingScore` descending

## User Behavior Signals

When user clicks Pass/Save/Apply:
1. Signal is saved to `userOpportunitySignals/{uid}/signals/{opportunityId}`
2. Legacy tracker is also updated for backward compatibility
3. Signal includes `runIdContext` to track which match run suggested it
4. Signals are used to exclude opportunities from future matches

## Testing Guide

### 1. First Dashboard Load
**Expected Behavior:**
- `shouldRunMatching` returns `shouldRun: true, reason: 'FIRST_DASHBOARD'`
- Matching API is called
- Results are saved to `userMatches/{uid}/current/latest`
- Dashboard displays matched opportunities

**How to Test:**
1. Create a new user account
2. Complete onboarding
3. Navigate to dashboard
4. Check console logs for matching execution
5. Verify matches appear in dashboard

### 2. Document Upload
**Expected Behavior:**
- Document upload increments `docsVersion`
- Next dashboard load triggers matching (reason: 'DOCS_UPLOAD')
- New matches reflect document content

**How to Test:**
1. Upload a document (executive summary, etc.)
2. Check Firestore: `profiles/{uid}.docsVersion` should increment
3. Navigate to dashboard
4. Matching should run automatically
5. Verify new matches reflect document content

### 3. Rerun Matching Button
**Expected Behavior:**
- Clicking "Rerun Matching" forces a new match run
- Progress is preserved
- New matches replace old ones

**How to Test:**
1. Click "Rerun Matching" button
2. Check console for matching execution
3. Verify new matches appear
4. Check that progress (passed opportunities) is preserved

### 4. Pass/Save/Apply Logging
**Expected Behavior:**
- Each action saves to `userOpportunitySignals`
- Actions are excluded from future matches
- Legacy tracker is also updated

**How to Test:**
1. Pass an opportunity
2. Check Firestore: `userOpportunitySignals/{uid}/signals/{oppId}` should have `status: 'passed'`
3. Save an opportunity
4. Check Firestore: Signal should have `status: 'saved'`
5. Apply to an opportunity
6. Check Firestore: Signal should have `status: 'applied'`

### 5. Version Tracking
**Expected Behavior:**
- Profile edits increment `profileVersion`
- Document uploads increment `docsVersion`
- Matching only runs when versions change

**How to Test:**
1. Edit profile (e.g., change keywords)
2. Check Firestore: `profiles/{uid}.profileVersion` should increment
3. Navigate to dashboard
4. Matching should run (reason: 'DOCS_UPLOAD')
5. Edit profile again without changing anything
6. Navigate to dashboard
7. Matching should NOT run (versions unchanged)

## Migration Plan

### Lazy Migration
- `migrateUserIfNeeded()` is called automatically when:
  - User first uses new matching system
  - User profile is accessed
- Sets default versions if missing:
  - `profileVersion: 1`
  - `docsVersion: 0`
  - `lastMatchProfileVersion: 0`
  - `lastMatchDocsVersion: 0`

### Backward Compatibility
- Old matching system still works
- New system is used when conditions are met
- Both systems can coexist during transition
- Legacy tracker (`profiles/{uid}/tracker`) is still updated

## Algorithm Version

Current version: **2.0.0**

Stored in:
- Match run records (`algorithmVersion` field)
- Audit logs (`algorithmVersion` field)

Used for:
- Tracking which algorithm version generated matches
- Debugging and analysis
- Future algorithm improvements

## TODOs / Future Enhancements

1. **Opportunity Enrichment**: Implement top-N opportunity enrichment from source URLs
   - Location: `src/lib/opportunityEnrichment.ts` (to be created)
   - Only enrich top 20-50 opportunities to control costs
   - Extract eligibility text, requirements, geography, burden signals

2. **Preference Learning**: Use user signals to improve matching
   - Analyze pass/save/apply patterns
   - Adjust keyword weights based on user behavior
   - Boost categories/agencies user frequently saves
   - Location: `src/lib/preferenceLearning.ts` (partially exists, needs enhancement)

3. **LLM Eligibility Notes**: Currently runs on top 20 matches
   - Consider reducing to top 10 for cost control
   - Add strict JSON schema validation
   - Improve prompt engineering for better notes

4. **Performance Optimization**:
   - Cache normalized opportunity text
   - Batch Firestore writes
   - Optimize opportunity fetching

5. **Firestore Indexes**: Create indexes as documented in `FIRESTORE_INDEXES.md`

## Error Handling

- All API routes include try-catch blocks
- Errors are logged to audit logs
- User-friendly error messages returned to frontend
- Fallback to old matching system if new system fails
- Graceful degradation if Firestore is unavailable

## Security

- All server-side code (OpenAI API, Firestore Admin)
- User signals require authentication
- Audit logs sanitize sensitive data
- Version tracking prevents unauthorized matching runs
