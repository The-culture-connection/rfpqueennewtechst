# Ingestion Test Results - All Sources

## ✅ Working Sources (2/5)

### 1. grantsGov ✅
- **Status**: Working perfectly
- **Fetched**: 100 opportunities
- **Upserted**: 0 (all skipped - already in database)
- **Configuration**: Correct

### 2. simplerGrants ✅
- **Status**: Working perfectly
- **Fetched**: 100 opportunities
- **Upserted**: 0 (all skipped - already in database)
- **Configuration**: Correct

---

## ❌ Failing Sources (3/5)

### 3. samGov ❌
- **Error**: HTTP 400 - "Date range must be null year(s) apart"
- **Issue**: Date range from 01/01/2024 to 12/31/2025 is too large (2 years)
- **Current Config**: 
  ```json
  "postedFrom": "01/01/2024",
  "postedTo": "12/31/2025"
  ```
- **Fix**: Reduce to 1 year range:
  ```json
  "postedFrom": "01/01/2025",
  "postedTo": "12/31/2025"
  ```
- **Or**: Use current year only

### 4. googleSearch ❌
- **Error**: HTTP 400 - "API key not valid"
- **Issue**: API key `e5f496245fcd04441` is invalid
- **Fix Required**:
  1. Go to Google Cloud Console: https://console.cloud.google.com/
  2. Enable "Custom Search API"
  3. Create/get a valid API key
  4. Update `SOURCES_JSON` secret with new key
  5. Also verify the Search Engine ID (`cx`) is correct

### 5. localJson ❌
- **Error**: HTTP 403 - "SignatureDoesNotMatch"
- **Issue**: Firebase Storage token has expired
- **Current URL**: `https://firebasestorage.googleapis.com/v0/b/therfpqueen-f11fd.firebasestorage.app/o/mock_opportunities_50.json?alt=media&token=be36e9af-2f7d-4472-8dd5-f9779455a85e`
- **Fix Required**:
  1. Go to Firebase Console → Storage
  2. Find `mock_opportunities_50.json`
  3. Get new download URL (or make file public)
  4. Update `SOURCES_JSON` secret with new URL

---

## Summary

- **Total Sources**: 5
- **Working**: 2 (grantsGov, simplerGrants)
- **Failing**: 3 (samGov, googleSearch, localJson)
- **Total Fetched**: 200 opportunities (from working sources)

---

## Next Steps

1. **Fix samGov**: Update date range to 1 year in `SOURCES_MERGED_CORRECT.json`
2. **Fix googleSearch**: Get valid API key and update secret
3. **Fix localJson**: Get new Firebase Storage URL and update secret

After fixes, redeploy and test again.
