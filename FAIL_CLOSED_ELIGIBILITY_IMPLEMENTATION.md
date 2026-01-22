# Fail-Closed Eligibility System Implementation

**Date:** 2026-01-22  
**Status:** ✅ Implemented

## Summary

Implemented a fail-closed eligibility system that eliminates ineligible opportunities from Top Matches by:
1. Treating missing eligibility data as **UNKNOWN** (not eligible)
2. Bucketing results: **Eligible** (Top Matches), **Unknown Eligibility** (separate bucket), **Ineligible** (excluded)
3. Making eligibility **NON-OVERRIDABLE** - AI merge cannot change eligibility status
4. Adding comprehensive auditability with run statistics

---

## Files Changed

### 1. Type Definitions (`src/types/index.ts`)
- Added `EligibilityEvaluation` interface with `status: 'eligible' | 'ineligible' | 'unknown'`
- Added `eligibilityDataQuality` to `Opportunity` interface
- Updated `TopMatch` to include `eligibility: EligibilityEvaluation`
- Updated `CurrentMatches` to include `unknownEligibilityMatches` and `runStats`
- Updated `MatchRun` to include `runStats`

### 2. Core Matching Algorithm (`src/lib/productionMatchAlgorithm.ts`)
- **NEW:** `computeEligibilityDataQuality()` - Computes data quality score and missing fields
- **NEW:** `evaluateEligibility()` - Fail-closed eligibility evaluation (replaces permissive `checkEligibilityGates()`)
- **UPDATED:** `computeScores()` - Uses `evaluateEligibility()` and sets `rankingScore = 0` if not eligible
- **UPDATED:** `matchOpportunitiesProduction()` - Returns `{ eligible, unknown, ineligible, runStats }` instead of `TopMatch[]`
- **NEW:** `computeRunStats()` - Computes audit statistics (counts, missing fields, top blockers)

### 3. API Routes

#### `src/app/api/run-matching/route.ts`
- Handles new return structure from `matchOpportunitiesProduction()`
- Enforces eligibility in AI merge (cannot override `eligibility.status !== 'eligible'`)
- Final safety check: filters out any non-eligible matches after AI merge
- Saves `unknownMatches` and `runStats` to Firestore
- Enhanced logging with run statistics

#### `src/app/api/opportunities/route.ts`
- Computes `eligibilityDataQuality` for all opportunities on ingestion
- Ensures `normalizedText` exists for matching

### 4. Data Access (`src/lib/matchDataAccess.ts`)
- **UPDATED:** `saveMatchRun()` - Accepts `unknownMatches` and `runStats` parameters
- Saves `unknownEligibilityMatches` to `CurrentMatches.unknownEligibilityMatches`
- Saves `runStats` to both `MatchRun` and `CurrentMatches`

### 5. Client-Side Hooks (`src/hooks/useOpportunities.ts`)
- Returns `unknownEligibilityOpportunities` array
- Loads unknown eligibility matches from `currentMatches.unknownEligibilityMatches`
- Maps eligibility status fields to opportunities

### 6. UI Components

#### `src/app/dashboard/page.tsx`
- Added state: `showUnknownEligibility` toggle
- Updated stats display to show eligible vs unknown counts
- Added toggle button to show/hide unknown eligibility opportunities
- Filters displayed opportunities based on toggle state
- Shows warning banner when viewing unknown eligibility opportunities

#### `src/components/OpportunityCard.tsx`
- Displays eligibility status badge (Eligible / Unknown Eligibility / Ineligible)
- Shows blockers and evidence for unknown/ineligible opportunities
- Only shows "Why You're Eligible" section for eligible opportunities

### 7. AI Refinement (`src/lib/aiMatchRefinement.ts`)
- Updated prompt to instruct AI: "Do NOT override eligibility status"
- AI can only refine scores and notes, not change eligibility

---

## New Eligibility Logic

### Fail-Closed Rules

1. **Funding Type Mismatch** → `status: 'ineligible'`
   - User wants grants but opportunity is RFP/contract → INELIGIBLE
   - Location: `evaluateEligibility()` lines 217-230

2. **Entity Type Mismatch** → `status: 'ineligible'`
   - Explicit mismatch (opportunity requires different entity type) → INELIGIBLE
   - Location: `evaluateEligibility()` lines 232-280

3. **Missing Entity Type Data** → `status: 'unknown'`
   - Both `applicantTypes` and `eligibleEntities` are empty → UNKNOWN
   - Location: `evaluateEligibility()` lines 282-293

4. **Missing Deadline** → `status: 'unknown'`
   - No `closeDate` AND not rolling deadline → UNKNOWN
   - Location: `evaluateEligibility()` lines 343-355

5. **Deadline Passed** → `status: 'ineligible'`
   - `closeDate` is in the past → INELIGIBLE
   - Location: `evaluateEligibility()` lines 300-311

6. **Deadline Too Far** → `status: 'ineligible'`
   - Deadline > 3x user's timeline preference AND not rolling → INELIGIBLE
   - Location: `evaluateEligibility()` lines 312-326

7. **Research-Heavy Without Capacity** → `status: 'ineligible'`
   - Research-heavy opportunity (NIH R01/U24/T32/K) without research capacity → INELIGIBLE
   - Location: `evaluateEligibility()` lines 357-380

---

## Firestore Schema Changes

### `opportunities/{opportunityId}`
**NEW FIELDS:**
- `eligibilityDataQuality`: {
  - `hasEligibleEntities: boolean`
  - `hasApplicantTypes: boolean`
  - `hasCloseDate: boolean`
  - `hasSufficientDescription: boolean`
  - `isRollingDeadline: boolean`
  - `qualityScore: number (0..1)`
  - `missingFields: string[]`
}

### `userMatches/{uid}/current/latest`
**UPDATED:**
- `topMatches`: TopMatch[] - **ONLY eligible matches**
- `unknownEligibilityMatches`: TopMatch[] - **NEW: Unknown eligibility bucket**
- `counts`: {
  - `eligible: number`
  - `unknown: number` - **NEW**
  - `ineligible: number` - **NEW**
}
- `runStats`: { ... } - **NEW: Run statistics**

### `userMatches/{uid}/runs/{runId}`
**UPDATED:**
- `topMatches`: TopMatch[] - All matches (eligible + unknown + ineligible for audit)
- `runStats`: { ... } - **NEW: Run statistics**

### `TopMatch` Structure
**UPDATED:**
- `eligibility`: EligibilityEvaluation - **NEW: Fail-closed evaluation**
  - `status: 'eligible' | 'ineligible' | 'unknown'`
  - `blockers: string[]`
  - `reasons: string[]`
  - `evidence: Array<{ field, value, source }>`
- `eligibilityGate`: EligibilityGate - **DEPRECATED** (kept for backward compatibility)

---

## Bucketing Behavior

### Top Matches (Default View)
- **ONLY** opportunities with `eligibility.status === 'eligible'`
- Filtered by `rankingScore >= MIN_RANKING_SCORE` (35)
- Sorted by `rankingScore` descending
- Limited to top 50

### Unknown Eligibility Bucket
- Opportunities with `eligibility.status === 'unknown'`
- Filtered by `rankingScore >= MIN_RANKING_SCORE` (35)
- Sorted by `rankingScore` descending
- Limited to top 50
- **Separate from Top Matches** - shown only when toggle is enabled

### Ineligible Opportunities
- Opportunities with `eligibility.status === 'ineligible'`
- **Excluded from all results** (not shown to user)
- Counted in `runStats.ineligibleCount` for auditability

---

## Eligibility Enforcement in AI Merge

### Non-Overridable Rule
**Location:** `src/app/api/run-matching/route.ts:158-211`

```typescript
// CRITICAL: If eligibility status is not "eligible", do not allow AI to boost it
if (match.eligibility.status !== 'eligible') {
  // Keep original eligibility status, but allow AI to update notes/summary
  return {
    ...match,
    notes: { ...match.notes, matchSummary: aiRefined?.matchReasoning?.summary || ... },
  };
}

// Only merge AI refinements for eligible matches
// CRITICAL: Preserve eligibility status - AI cannot override
eligibility: match.eligibility,
```

**Final Safety Check:**
```typescript
// FINAL ENFORCEMENT: Filter out any matches that are not eligible
finalMatches = finalMatches.filter(m => m.eligibility.status === 'eligible');
```

---

## Cache Invalidation

### Version Tracking
- `profileVersion`: Increments on profile edits (via `AuthProvider.tsx`)
- `docsVersion`: Increments on document upload (via `extract-document/route.ts:237`)

### `shouldRunMatching()` Logic
**Location:** `src/lib/matchDataAccess.ts:12-82`

1. If `userMatches/{uid}/current/latest` doesn't exist → `shouldRun: true, reason: 'FIRST_DASHBOARD'`
2. If `profileVersion !== lastMatchProfileVersion` → `shouldRun: true, reason: 'DOCS_UPLOAD'`
3. If `docsVersion !== lastMatchDocsVersion` → `shouldRun: true, reason: 'DOCS_UPLOAD'`
4. Otherwise → `shouldRun: false`

**Result:** Matching only runs when:
- First dashboard load (no current matches)
- Profile version changed
- Docs version changed
- User clicks "Rerun Matching" button

---

## Logging & Auditability

### Run Statistics
**Location:** `src/lib/productionMatchAlgorithm.ts:942-1003`

Each match run computes:
- `totalConsidered`: Total opportunities evaluated
- `eligibleCount`: Count of eligible opportunities
- `unknownCount`: Count of unknown eligibility opportunities
- `ineligibleCount`: Count of ineligible opportunities
- `missingFieldCounts`: {
  - `applicantTypes`: Count missing
  - `eligibleEntities`: Count missing
  - `closeDate`: Count missing
  - `description`: Count missing
}
- `topBlockers`: Top 10 blockers with counts

### Logging Locations
1. **Server Console:**
   - `[run-matching] Run Statistics:` - Full run stats
   - `[Production Matching] Eligibility breakdown:` - Eligible/unknown/ineligible counts
   - `[Production Matching] After filtering:` - Post-filter counts

2. **Firestore:**
   - `userMatches/{uid}/runs/{runId}.runStats` - Full statistics
   - `userMatches/{uid}/current/latest.runStats` - Latest run statistics
   - `Ai api audit/{requestId}` - AI refinement audit logs

---

## UI Changes

### Dashboard Stats
- **Eligible Matches**: Count of eligible opportunities
- **Unknown Eligibility**: Count of unknown eligibility opportunities (yellow)
- **Remaining**: Available opportunities (excluding passed/saved)
- **Passed**: Count of passed opportunities

### Toggle for Unknown Eligibility
- Button appears when `unknownEligibilityOpportunities.length > 0`
- Toggle between "Eligible Matches" (default) and "Unknown Eligibility"
- Warning banner shown when viewing unknown eligibility opportunities

### Opportunity Card
- **Eligibility Status Badge:**
  - Green: "✓ Eligible"
  - Yellow: "? Unknown Eligibility"
  - Red: "✗ Ineligible" (rarely shown)
- **Blockers Display** (for unknown/ineligible):
  - Shows list of blockers (e.g., "missing applicant types", "entity type mismatch")
  - Expandable "View Evidence" section
- **"Why You're Eligible"** section:
  - Only shown for eligible opportunities
  - Hidden for unknown/ineligible

---

## Testing Guide

### Test Case 1: First Dashboard Load
1. New user logs in
2. Expected: `shouldRunMatching()` returns `shouldRun: true, reason: 'FIRST_DASHBOARD'`
3. Matching runs, results saved
4. Refresh page
5. Expected: `shouldRunMatching()` returns `shouldRun: false`
6. Results loaded from cache

### Test Case 2: Document Upload Triggers Matching
1. User uploads document
2. Expected: `docsVersion` increments
3. Next dashboard load
4. Expected: `shouldRunMatching()` returns `shouldRun: true, reason: 'DOCS_UPLOAD'`
5. Matching runs with new document data

### Test Case 3: Profile Edit Triggers Matching
1. User edits profile
2. Expected: `profileVersion` increments
3. Next dashboard load
4. Expected: `shouldRunMatching()` returns `shouldRun: true, reason: 'DOCS_UPLOAD'`
5. Matching runs with updated profile

### Test Case 4: Missing Eligibility Data → Unknown
1. Opportunity with empty `applicantTypes` and `eligibleEntities`
2. Expected: `eligibility.status === 'unknown'`
3. Expected: Appears in "Unknown Eligibility" bucket, NOT in Top Matches

### Test Case 5: Entity Type Mismatch → Ineligible
1. Nonprofit user, opportunity requires "for-profit" only
2. Expected: `eligibility.status === 'ineligible'`
3. Expected: Does NOT appear in any results

### Test Case 6: AI Cannot Override Eligibility
1. Opportunity with `eligibility.status === 'unknown'`
2. AI refinement runs
3. Expected: Status remains `'unknown'`, AI can only update notes/summary
4. Expected: Opportunity still in unknown bucket, NOT in Top Matches

---

## How to Test Locally

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Test eligibility evaluation:**
   - Upload a document for a nonprofit user
   - Check console logs for eligibility breakdown
   - Verify only eligible opportunities appear in Top Matches

3. **Test unknown eligibility bucket:**
   - Look for opportunities with missing `applicantTypes`/`eligibleEntities`
   - Verify they appear in "Unknown Eligibility" bucket
   - Toggle to view them

4. **Test cache invalidation:**
   - Load dashboard (matching runs)
   - Refresh page (matching should NOT run)
   - Upload document (matching should run on next load)

5. **Check Firestore:**
   - `userMatches/{uid}/current/latest` - Should have `unknownEligibilityMatches` and `runStats`
   - `userMatches/{uid}/runs/{runId}` - Should have `runStats` with counts

---

## Known Limitations / TODOs

1. **Opportunity Enrichment** (Not Implemented):
   - Top-N opportunity enrichment from source URLs is marked as TODO
   - Would improve data quality for unknown eligibility opportunities

2. **Preference Learning** (Not Implemented):
   - User signals (pass/save/apply) are stored but not yet used for learning
   - Future: Adjust keyword weights based on user behavior

3. **Geography Gate** (Soft Only):
   - Currently applies penalty only, not a hard gate
   - Could be made configurable (strict vs. soft)

---

## Success Criteria Met

✅ **1. No ineligible opportunities in Top Matches**
- Only `status === 'eligible'` opportunities appear

✅ **2. Unknown eligibility bucketed separately**
- `unknownEligibilityMatches` stored separately
- UI toggle to view them

✅ **3. Eligibility non-overridable**
- AI merge preserves eligibility status
- Final safety check filters non-eligible

✅ **4. Structured eligibility status**
- `EligibilityEvaluation` with status, blockers, reasons, evidence

✅ **5. Cache invalidation**
- Matching runs only when `profileVersion`/`docsVersion` changes
- `shouldRunMatching()` logic implemented

---

## Next Steps

1. **Monitor run statistics** to identify data quality issues
2. **Implement opportunity enrichment** for top candidates with missing data
3. **Add preference learning** based on user signals
4. **Create Firestore indexes** as documented in `FIRESTORE_INDEXES.md`
