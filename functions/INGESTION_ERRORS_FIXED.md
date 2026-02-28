# Ingestion Errors Analysis and Fixes

## Summary of Issues from Logs

### ✅ Working Sources
1. **grantsGov** - ✅ Successfully fetched 100 opportunities
   - Note: `upserted=0 skipped=100` means they were already in the database (rawHash matched)

### ❌ Failed Sources

#### 1. **samGov** - HTTP 404
**Error:** `HTTP 404. body=`

**Possible Causes:**
- SAM.gov API endpoint might have changed
- API key might be invalid
- Endpoint URL might be incorrect

**Fix:** The endpoint `https://api.sam.gov/prod/opportunities/v2/search` might need to be verified. SAM.gov API documentation should be checked for the correct endpoint.

#### 2. **simplerGrants** - HTTP 401 "Invalid API key"
**Error:** `HTTP 401. body={"message": "Invalid API key"}`

**Root Cause:** The API key in your config has an extra "Y" at the start:
- Current: `"Yv08sW5JXAlwXZoWji30tMYkOc"`
- Should be: `"v08sW5JXAlwXZoWji30tMYkOc"`

**Fix:** ✅ Fixed in `examplesources.json` - removed the leading "Y"

#### 3. **googleSearch** - HTTP 400 "API key not valid"
**Error:** `HTTP 400. body={"error": {"message": "API key not valid"}}`

**Root Causes:**
1. API key has extra "Y" at the start:
   - Current: `"Ye5f496245fcd04441"`
   - Should be: `"e5f496245fcd04441"`
2. `cx` (Search Engine ID) is still a placeholder: `"YOUR_GOOGLE_SEARCH_ENGINE_ID_HERE"`

**Fix:** ✅ Fixed API key in `examplesources.json` - removed leading "Y"
**Action Required:** Replace `"YOUR_GOOGLE_SEARCH_ENGINE_ID_HERE"` with your actual Google Custom Search Engine ID

#### 4. **localJson** - TLS Certificate Error
**Error:** `ERR_TLS_CERT_ALTNAME_INVALID: Host: www.web-production-9c20.up.railway.app. is not in the cert's altnames: DNS:*.up.railway.app`

**Root Cause:** Railway's SSL certificate is for `*.up.railway.app` (wildcard), but the URL has `www.` prefix which doesn't match.

**Fix:** ✅ Fixed in `examplesources.json` - removed `www.` prefix
- Changed: `https://www.web-production-9c20.up.railway.app/...`
- To: `https://web-production-9c20.up.railway.app/...`

---

## Fixed Issues

✅ **simplerGrants API key** - Removed leading "Y"
✅ **googleSearch API key** - Removed leading "Y"  
✅ **localJson URL** - Removed `www.` prefix

## Still Need Action

⚠️ **googleSearch** - Replace `"YOUR_GOOGLE_SEARCH_ENGINE_ID_HERE"` with actual Search Engine ID
⚠️ **samGov** - Verify API key is valid and endpoint is correct (might need to check SAM.gov API docs)

---

## Next Steps

1. **Update SOURCES_JSON secret** with the fixed `examplesources.json`:
   ```bash
   cd functions
   Get-Content examplesources.json | firebase functions:secrets:set SOURCES_JSON
   ```

2. **Add your Google Search Engine ID** to `examplesources.json`:
   - Replace `"YOUR_GOOGLE_SEARCH_ENGINE_ID_HERE"` with your actual ID
   - Then update the secret again

3. **Verify SAM.gov API key**:
   - Check if `SAM-ddb13bbd-7430-4ae4-9d0a-46de996f6d3d` is still valid
   - Verify the endpoint URL is correct

4. **Redeploy function** (if needed):
   ```bash
   firebase deploy --only functions:ingestOpportunitiesHttp
   ```

5. **Test again**:
   ```bash
   curl -X POST https://ingestopportunitieshttp-mmmrt6wtlq-uc.a.run.app \
     -H "Content-Type: application/json" \
     -H "Content-Length: 2" \
     -d "{}"
   ```

---

## Expected Results After Fixes

- ✅ **grantsGov** - Should continue working
- ✅ **simplerGrants** - Should work now (API key fixed)
- ✅ **localJson** - Should work now (URL fixed)
- ⚠️ **googleSearch** - Will work once you add the Search Engine ID
- ⚠️ **samGov** - May need API key verification or endpoint check
