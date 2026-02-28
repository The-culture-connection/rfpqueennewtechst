# Fix Failing Sources: samGov, googleSearch, localJson

## Summary of Issues

Based on the logs, here are the specific problems:

### 1. **samGov** - HTTP 401 "API_KEY_INVALID"
- **Problem:** API key `SAM-ddb13bbd-7430-4ae4-9d0a-46de996f6d3d` is invalid
- **Solution:** Get a new API key from https://api.sam.gov/ OR remove it (you're already loading SAM.gov from CSV)

### 2. **googleSearch** - HTTP 400 "API key not valid"
- **Problem:** API key `e5f496245fcd04441` is invalid
- **Also:** `cx` parameter is still a placeholder `"YOUR_GOOGLE_SEARCH_ENGINE_ID_HERE"`
- **Solution:** Get valid Google API key + Search Engine ID, OR remove it

### 3. **localJson** - HTTP 404
- **Problem:** File doesn't exist at Railway URL
- **Solution:** Upload to Firebase Storage OR remove it

---

## Quick Fix: Use Only Working Sources

I've created `MINIMAL_WORKING_SOURCES.json` with just the 2 working sources:

```bash
cd functions
Get-Content MINIMAL_WORKING_SOURCES.json | firebase functions:secrets:set SOURCES_JSON
firebase deploy --only functions:ingestOpportunitiesHttp
```

This will give you:
- ✅ grantsGov (100 opportunities)
- ✅ simplerGrants (100 opportunities)
- Total: 200 opportunities per run

---

## Fix Each Source (If Needed)

### Fix samGov

**Option A: Get New API Key**
1. Go to https://api.sam.gov/
2. Register/login
3. Generate API key
4. Update `examplesources.json`

**Option B: Remove It (Recommended)**
- You're already loading SAM.gov from CSV files
- Remove the `samGov` entry from `examplesources.json`

### Fix googleSearch

1. **Get Google API Key:**
   - Go to https://console.cloud.google.com/
   - Enable "Custom Search API"
   - Create API key

2. **Get Search Engine ID:**
   - Go to https://programmablesearchengine.google.com/controlpanel/all
   - Create/find your Search Engine
   - Copy the ID (format: `017576662512468239146:omuauf_lfve`)

3. **Update `examplesources.json`:**
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

### Fix localJson

**Option A: Upload to Firebase Storage**
```bash
firebase storage:upload "public/mock_opportunities_50.json" /mock-opportunities/mock_opportunities_50.json
```
Then get the public URL from Firebase Console and update `examplesources.json`

**Option B: Remove It**
- Remove the `localJson` entry if you don't need mock data

---

## Recommended: Start with Working Sources Only

Use `MINIMAL_WORKING_SOURCES.json` to get the system working, then add back sources as you fix credentials:

```bash
cd functions
Get-Content MINIMAL_WORKING_SOURCES.json | firebase functions:secrets:set SOURCES_JSON
firebase deploy --only functions:ingestOpportunitiesHttp
```

Then test:
```bash
curl -X POST https://ingestopportunitieshttp-mmmrt6wtlq-uc.a.run.app \
  -H "Content-Type: application/json" \
  -H "Content-Length: 2" \
  -d "{}"
```

You should see 200 opportunities fetched (100 from each working source).
