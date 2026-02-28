# Issues Fixed in examplesources.json

## Problems Found and Fixed:

### 1. **grantsGov** (Line 3-5)
- ❌ **Typo**: `search2L` → ✅ Fixed to `search2`
- ❌ **Missing**: `method: "POST"` → ✅ Added
- ❌ **Missing**: `requestBody` → ✅ Added with proper structure

### 2. **samGov** (Line 6-14)
- ❌ **Wrong auth**: Used `headerName: "X-API-Key"` → ✅ Fixed to `queryParam: "api_key"`
- ❌ **Missing**: `method: "GET"` → ✅ Added
- ❌ **Missing**: `additionalQueryParams` (postedFrom, postedTo, limit) → ✅ Added

### 3. **google** (Line 15-23)
- ❌ **Duplicate**: This source is redundant (you already have "googleSearch") → ✅ Removed

### 4. **simplerGrants** (Line 24-31)
- ❌ **Wrong auth type**: Used `"type": "bearer"` → ✅ Fixed to `"type": "apiKey"` with `"headerName": "X-API-Key"`
- ❌ **Missing**: `method: "POST"` → ✅ Added
- ❌ **Missing**: `requestBody` → ✅ Added with pagination and filters

### 5. **googleSearch** (Line 32-40)
- ❌ **Missing**: `additionalQueryParams` (cx, q, num) → ✅ Added
- ❌ **Missing**: `method: "GET"` → ✅ Added (optional but recommended)

### 6. **localJson** (Line 41-47)
- ❌ **Missing**: `method: "GET"` → ✅ Added (optional but recommended)
- ✅ Railway URL looks correct

## Summary of Changes:

1. Fixed Grants.gov URL typo (`search2L` → `search2`)
2. Added `method` field for all sources
3. Added `requestBody` for POST requests (grantsGov, simplerGrants)
4. Fixed SAM.gov auth (header → queryParam)
5. Added `additionalQueryParams` for SAM.gov and Google Search
6. Fixed Simpler.Grants.gov auth (bearer → apiKey with header)
7. Removed duplicate "google" source
8. Added proper structure for all sources

## Next Steps:

1. Replace placeholder tokens with your actual API keys:
   - `YOUR_SAM_GOV_API_KEY_HERE`
   - `YOUR_SIMPLER_GRANTS_API_KEY_HERE`
   - `YOUR_GOOGLE_API_KEY_HERE`
   - `YOUR_GOOGLE_SEARCH_ENGINE_ID_HERE`

2. Set the secret:
   ```bash
   cd functions
   firebase functions:secrets:set SOURCES_JSON < examplesources.json
   ```

3. Test the function:
   ```powershell
   Invoke-WebRequest -Uri "https://ingestopportunitieshttp-mmmrt6wtlq-uc.a.run.app" -Method GET -UseBasicParsing
   ```
