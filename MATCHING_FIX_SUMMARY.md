# Matching Results Display Fix - Summary

## Root Cause Identified

The dashboard showed 0 eligible matches despite backend logs showing 48 eligible matches. The root cause was **non-deterministic opportunity IDs** generated with `Math.random()`, causing ID mismatches between:
- Firestore stored matches (with old random IDs)
- `/api/opportunities` responses (with new random IDs each fetch)

When the UI tried to map `match.opportunityId` from Firestore to opportunities from `/api/opportunities`, it found zero matches → UI showed 0 eligible.

## Fixes Implemented

### 1. Stable Opportunity ID Generation

**File: `src/lib/stableOpportunityId.ts`** (NEW)

```typescript
// Deterministic ID generation
stableOpportunityId(source: string, stableKey: string | number): string
// Returns: "source-stablekey" (normalized, lowercase)

// For sources without stable keys (Google Search)
stableOpportunityIdFromFields(source, title, url, agency): string
// Returns: "source-{sha256 hash of title+url+agency}"
```

**ID Generation by Source:**
- **Grants.gov**: `grants-gov-{hit.id || hit.number}`
- **Simpler.Grants.gov**: `simpler-grants-gov-{opportunity_id || legacy_opportunity_id || opportunity_number}`
- **SAM.gov**: `sam-gov-{noticeId || id}`
- **Google Search**: `google-search-{hash(title+url+agency)}`
- **SAM.gov CSV**: `sam-gov-{noticeId}` or hash fallback
- **Grants.gov CSV**: `grants-gov-{opportunity_number}` or hash fallback

### 2. Updated ID Generation Locations

**Files Updated:**
- `src/lib/apiIntegrations.ts` - All 4 API integrations
- `src/lib/csvParser.ts` - CSV normalization

**Before:**
```typescript
id: `grants-gov-${hit.id}-${Math.random().toString(36).substr(2, 9)}`
```

**After:**
```typescript
id: stableOpportunityId('Grants.gov', hit.id || hit.number)
```

### 3. Use API Response Directly

**File: `src/hooks/useOpportunities.ts`**

**Before:** Waited for Firestore, then tried to map matches to opportunities (failed due to ID mismatch)

**After:** 
1. **Primary path**: Use `runData.opportunities` directly from API response (immediate display)
2. **Fallback path**: Only if API response is empty, load from Firestore with mapping
3. **Final fallback**: Old matching system if both fail

### 4. Comprehensive Debugging

**Client-side logs added:**
```
[MATCHING][CLIENT] shouldRun=true, reason=DOCS_UPLOAD
[MATCHING][CLIENT] runData keys: ['success', 'runId', 'matchesCount', 'opportunities', 'unknownOpportunities', 'runStats']
[MATCHING][CLIENT] runData.opportunities length: 48
[MATCHING][CLIENT] runData.unknownOpportunities length: 50
[MATCHING][CLIENT] runData.matchesCount: 48
[MATCHING][CLIENT] Using opportunities directly from API response: 48 eligible
```

**Firestore fallback logs:**
```
[MATCHING][CLIENT] Firestore topMatches length: 48
[MATCHING][CLIENT] mapping failures 0/48, sample missing IDs: []
```

**Dashboard logs:**
```
[DASHBOARD][DEBUG] matchedOpportunities.length: 48
[DASHBOARD][DEBUG] passedIds.length: 0, savedIds.length: 0
[DASHBOARD][DEBUG] displayedOpportunities.length: 48
[DASHBOARD][DEBUG] currentIndex: 0
```

## Final API Response Shape

**Endpoint: `/api/run-matching` (POST)**

```json
{
  "success": true,
  "runId": "uuid-string",
  "matchesCount": 48,
  "opportunities": [
    {
      "id": "grants-gov-356250",
      "source": "Grants.gov",
      "title": "Opportunity Title",
      "agency": "Agency Name",
      "description": "...",
      "winRate": 85.0,
      "matchScore": 85.0,
      "eligibilityStatus": "eligible",
      "eligibilityBlockers": [],
      "eligibilityNotes": ["..."],
      "matchReasoning": {
        "summary": "...",
        "confidenceScore": 85,
        "specificReasons": [...]
      },
      // ... other opportunity fields
    }
    // ... 48 eligible opportunities
  ],
  "unknownOpportunities": [
    {
      "id": "grants-gov-50283",
      "eligibilityStatus": "unknown",
      // ... similar structure
    }
    // ... 50 unknown eligibility opportunities
  ],
  "runStats": {
    "totalConsidered": 219,
    "eligibleCount": 48,
    "unknownCount": 100,
    "ineligibleCount": 71,
    "missingFieldCounts": {...},
    "topBlockers": [...]
  }
}
```

## Stable ID Function Implementation

**File: `src/lib/stableOpportunityId.ts`**

```typescript
export function stableOpportunityId(source: string, stableKey: string | number | null | undefined): string {
  if (!stableKey) {
    throw new Error(`stableKey is required for source: ${source}`);
  }
  
  const normalizedSource = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  const normalizedKey = String(stableKey).toLowerCase().trim();
  
  return `${normalizedSource}-${normalizedKey}`;
}

export function stableOpportunityIdFromFields(
  source: string,
  title: string,
  url: string,
  agency?: string
): string {
  const normalizedSource = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  const hashInput = `${title}|${url}|${agency || ''}`.toLowerCase().trim();
  const hash = createHash('sha256').update(hashInput).digest('hex').substring(0, 12);
  
  return `${normalizedSource}-${hash}`;
}
```

## Verification Steps

After deployment, verify:

1. **Hard refresh dashboard**: Eligible Matches should equal backend `matchesCount`
2. **Check console logs**: Should see `[MATCHING][CLIENT] runData.opportunities length: 48`
3. **Toggle unknown eligibility**: Unknown bucket should populate if present
4. **Reload**: `should-run` returns false → existing matches should still appear from Firestore
5. **Mapping failures**: Should be 0 (or near 0 if a few are missing)

## Files Changed

1. `src/lib/stableOpportunityId.ts` - NEW: Stable ID generation
2. `src/lib/apiIntegrations.ts` - Updated all ID generation
3. `src/lib/csvParser.ts` - Updated CSV ID generation
4. `src/hooks/useOpportunities.ts` - Use API response directly + debugging
5. `src/app/dashboard/page.tsx` - Added debugging logs
6. `src/app/api/run-matching/route.ts` - Added mapping error warnings

## Expected Behavior

**Before Fix:**
- Backend: "Returning 48 eligible"
- UI: "Eligible Matches = 0"
- Cause: ID mismatch → mapping found 0 matches

**After Fix:**
- Backend: "Returning 48 eligible"
- UI: "Eligible Matches = 48" ✅
- Cause: Stable IDs + direct API response → perfect mapping

## Deployment Notes

- **No Firebase Functions deployment needed** (only web app changes)
- **Web app changes** will deploy automatically with normal deployment
- **Stable IDs** ensure future Firestore fallback will also work correctly
