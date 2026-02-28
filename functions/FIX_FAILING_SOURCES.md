# Fix Failing Sources: samGov, googleSearch, localJson

## Current Errors from Logs

### 1. **samGov** - HTTP 401 "API_KEY_INVALID"
**Error:** `HTTP 401. body=<html><body><h1>API_KEY_INVALID</h1><p>An invalid API key was supplied.</p></body></html>`

**Issue:** The API key `SAM-ddb13bbd-7430-4ae4-9d0a-46de996f6d3d` is invalid or expired.

**Solutions:**
1. **Get a new SAM.gov API key:**
   - Go to https://api.sam.gov/
   - Register/login and generate a new API key
   - Update the token in `examplesources.json`

2. **Verify the endpoint is correct:**
   - The endpoint `https://api.sam.gov/prod/opportunities/v2/search` might have changed
   - Check SAM.gov API documentation for current endpoint

3. **Temporarily disable SAM.gov:**
   - Remove it from `SOURCES_JSON` if you don't need it right now
   - You're already loading SAM.gov from CSV files in Firebase Storage

---

### 2. **googleSearch** - HTTP 400 "API key not valid"
**Error:** `HTTP 400. body={"error": {"message": "API key not valid"}}`

**Issue:** The API key `e5f496245fcd04441` is invalid.

**Solutions:**
1. **Verify the API key:**
   - Check Google Cloud Console → APIs & Services → Credentials
   - Ensure Custom Search API is enabled
   - Verify the API key is correct

2. **Check the Search Engine ID:**
   - The `cx` parameter is set to `"AIzaSyCz4scHPugLYKHg598rWOwMgdYg6Zuvfss"` (looks like an API key, not a Search Engine ID)
   - Search Engine ID should be a different format (usually shorter, like `017576662512468239146:omuauf_lfve`)
   - Get it from: https://programmablesearchengine.google.com/controlpanel/all

3. **Fix the configuration:**
   - `key` parameter should be your Google API key
   - `cx` parameter should be your Search Engine ID (not an API key)

---

### 3. **localJson** - HTTP 404
**Error:** `HTTP 404. body=<!DOCTYPE html>...` (Next.js 404 page)

**Issue:** The file doesn't exist at that URL on Railway.

**Solutions:**
1. **Check if the file exists:**
   ```powershell
   Invoke-WebRequest -Uri "https://web-production-9c20.up.railway.app/mock_opportunities_50.json" -Method GET
   ```

2. **Upload to Firebase Storage instead:**
   - Upload `mock_opportunities_50.json` to Firebase Storage
   - Get the public download URL
   - Use that URL in `SOURCES_JSON`

3. **Use the API route instead:**
   - The file is in `public/mock_opportunities_50.json`
   - Use: `https://web-production-9c20.up.railway.app/mock_opportunities_50.json`
   - But make sure the file is actually deployed to Railway's public folder

4. **Temporarily disable:**
   - Remove from `SOURCES_JSON` if not needed right now

---

## Quick Fixes

### Option 1: Remove Failing Sources (Temporary)

Edit `examplesources.json` and remove or comment out the failing sources:

```json
[
  {
    "source": "grantsGov",
    ...
  },
  {
    "source": "simplerGrants",
    ...
  }
  // Temporarily removed: samGov, googleSearch, localJson
]
```

### Option 2: Fix Each Source

#### Fix samGov:
1. Get a valid SAM.gov API key from https://api.sam.gov/
2. Update the token in `examplesources.json`
3. Or remove it if you're using CSV files instead

#### Fix googleSearch:
1. Get your Google API key from Google Cloud Console
2. Get your Search Engine ID from https://programmablesearchengine.google.com/
3. Update both in `examplesources.json`:
   ```json
   {
     "source": "googleSearch",
     "auth": {
       "token": "YOUR_ACTUAL_GOOGLE_API_KEY"
     },
     "additionalQueryParams": {
       "cx": "YOUR_ACTUAL_SEARCH_ENGINE_ID"
     }
   }
   ```

#### Fix localJson:
1. Verify the file exists on Railway
2. Or upload to Firebase Storage and use that URL
3. Or use the API route: `https://web-production-9c20.up.railway.app/api/mock-opportunities`

---

## Recommended Action

Since you're already loading SAM.gov from CSV files, you can:

1. **Remove samGov** from `SOURCES_JSON` (you don't need the API)
2. **Fix or remove googleSearch** (get valid API key + Search Engine ID)
3. **Fix localJson** (verify Railway URL or use Firebase Storage)

Then update the secret:
```bash
cd functions
Get-Content examplesources.json | firebase functions:secrets:set SOURCES_JSON
firebase deploy --only functions:ingestOpportunitiesHttp
```
