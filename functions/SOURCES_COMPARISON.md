# Sources Configuration Comparison

## Current Files Status

### ✅ `functions/examplesources.json` (Partially Correct)
- ✅ simplerGrants: Correct API key (`v08sW5JXAlwXZoWji30tMYkOc`)
- ❌ samGov: Old API key (`SAM-ddb13bbd-7430-4ae4-9d0a-46de996f6d3d`)
- ❌ googleSearch: Placeholder for cx (`YOUR_GOOGLE_SEARCH_ENGINE_ID_HERE`)
- ❌ localJson: Railway API route (doesn't exist)

### ✅ `source.json` (Partially Correct)
- ✅ samGov: Newer API key (`SAM-f3919451-b9b2-408e-9356-8c329022e4f6`)
- ✅ simplerGrants: Correct API key (`v08sW5JXAlwXZoWji30tMYkOc`)
- ⚠️ googleSearch: Has `cx` value but looks like API key format
- ❌ localJson: Uses `gs://` URL (not HTTP-compatible)

### ❌ `examplesources.json` (Root - Outdated)
- ❌ simplerGrants: Wrong API key (`Yv08sW5JXAlwXZoWji30tMYkOc` - has Y prefix)

---

## ✅ **RECOMMENDED: `functions/ALL_SOURCES_CORRECT.json`**

I've created a consolidated version with:
- ✅ grantsGov: Working (no auth)
- ✅ samGov: Newer API key from `source.json`
- ✅ simplerGrants: Correct API key (no Y prefix)
- ⚠️ googleSearch: Has cx value (may need verification)
- ✅ localJson: Firebase Storage HTTP URL (from your previous test)

---

## To Use the Corrected Version:

```bash
cd functions
Get-Content ALL_SOURCES_CORRECT.json | firebase functions:secrets:set SOURCES_JSON
firebase deploy --only functions:ingestOpportunitiesHttp
```

---

## Notes:

1. **samGov**: The newer API key (`SAM-f3919451-b9b2-408e-9356-8c329022e4f6`) might work, but if it fails, you'll need to get a valid one from https://api.sam.gov/

2. **googleSearch**: The `cx` value `AIzaSyCz4scHPugLYKHg598rWOwMgdYg6Zuvfss` looks like an API key format, not a Search Engine ID. Search Engine IDs are usually shorter and have a different format (e.g., `017576662512468239146:omuauf_lfve`). You may need to verify this.

3. **localJson**: Using the Firebase Storage URL from your previous test. If the token expires, you'll need to update it.
