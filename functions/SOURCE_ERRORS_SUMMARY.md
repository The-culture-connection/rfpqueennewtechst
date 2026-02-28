# Source Errors Summary and Solutions

## Current Status

✅ **grantsGov** - Working perfectly (100 opportunities fetched)
✅ **simplerGrants** - Working perfectly (100 opportunities fetched)

❌ **samGov** - HTTP 401 "API_KEY_INVALID"
❌ **googleSearch** - HTTP 400 "API key not valid"  
❌ **localJson** - HTTP 404 (file not found)

---

## Issue 1: samGov - Invalid API Key

**Error:** `HTTP 401. API_KEY_INVALID - An invalid API key was supplied`

**Current API Key:** `SAM-ddb13bbd-7430-4ae4-9d0a-46de996f6d3d`

**Solutions:**

### Option A: Get a Valid SAM.gov API Key
1. Go to https://api.sam.gov/
2. Register/login
3. Generate a new API key
4. Update `examplesources.json` with the new key

### Option B: Remove SAM.gov (Recommended)
Since you're already loading SAM.gov opportunities from CSV files in Firebase Storage, you don't need the API:
- Remove the `samGov` entry from `examplesources.json`
- Your existing CSV loader will continue to work

---

## Issue 2: googleSearch - Invalid API Key

**Error:** `HTTP 400. API key not valid`

**Current Issues:**
1. API key `e5f496245fcd04441` is invalid
2. `cx` parameter is set to `"AIzaSyCz4scHPugLYKHg598rWOwMgdYg6Zuvfss"` which looks like an API key, not a Search Engine ID

**Solutions:**

### Step 1: Get Valid Google API Key
1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Enable "Custom Search API"
3. Create/get an API key
4. Update `examplesources.json` with the key

### Step 2: Get Search Engine ID
1. Go to: https://programmablesearchengine.google.com/controlpanel/all
2. Create or find your Search Engine
3. Copy the Search Engine ID (format: `017576662512468239146:omuauf_lfve`)
4. Update `examplesources.json`:
   ```json
   {
     "source": "googleSearch",
     "auth": {
       "token": "YOUR_ACTUAL_GOOGLE_API_KEY"
     },
     "additionalQueryParams": {
       "cx": "YOUR_ACTUAL_SEARCH_ENGINE_ID",
       "q": "grants funding opportunities",
       "num": "10"
     }
   }
   ```

### Option: Remove googleSearch
If you don't need Google Search right now, remove it from `examplesources.json`

---

## Issue 3: localJson - File Not Found (404)

**Error:** `HTTP 404` - File doesn't exist at Railway URL

**Current URL:** `https://web-production-9c20.up.railway.app/mock_opportunities_50.json`

**Solutions:**

### Option A: Use API Route (Fixed)
✅ I've updated the URL to use the API route:
- Changed to: `https://web-production-9c20.up.railway.app/api/mock-opportunities`
- This should work if the API route is deployed

### Option B: Upload to Firebase Storage
1. Upload `mock_opportunities_50.json` to Firebase Storage
2. Get the public download URL
3. Use that URL in `examplesources.json`

### Option C: Remove localJson
If you don't need mock data, remove it from `examplesources.json`

---

## Recommended Configuration

For now, keep only the working sources:

```json
[
  {
    "source": "grantsGov",
    "endpointUrl": "https://api.grants.gov/v1/api/search2",
    "method": "POST",
    "auth": { "type": "none" },
    "requestBody": { ... }
  },
  {
    "source": "simplerGrants",
    "endpointUrl": "https://api.simpler.grants.gov/v1/opportunities/search",
    "method": "POST",
    "auth": {
      "type": "apiKey",
      "headerName": "X-API-Key",
      "token": "v08sW5JXAlwXZoWji30tMYkOc"
    },
    "requestBody": { ... }
  }
]
```

Then add back the others once you have valid credentials.

---

## Quick Fix: Update Secret

After fixing `examplesources.json`:

```bash
cd functions
Get-Content examplesources.json | firebase functions:secrets:set SOURCES_JSON
firebase deploy --only functions:ingestOpportunitiesHttp
```
