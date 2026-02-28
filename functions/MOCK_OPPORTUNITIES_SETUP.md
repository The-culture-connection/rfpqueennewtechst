# Setting Up Mock Opportunities in SOURCES_JSON

You have a local JSON file at `C:\Users\grace\Downloads\mock_opportunities_50.json` that you want to integrate.

## Quick Solution: Copy File to Public Folder

### Step 1: Copy the file to your project

```powershell
# From your project root (webapp directory)
Copy-Item "C:\Users\grace\Downloads\mock_opportunities_50.json" -Destination ".\public\mock_opportunities_50.json"
```

This makes the file accessible at: `https://your-domain.com/mock_opportunities_50.json`

### Step 2: Add to SOURCES_JSON

Add this entry to your `SOURCES_JSON`:

```json
{
  "source": "mockOpportunities",
  "endpointUrl": "https://your-railway-app.up.railway.app/mock_opportunities_50.json",
  "method": "GET",
  "auth": {
    "type": "none"
  }
}
```

**For local development:**
```json
{
  "source": "mockOpportunities",
  "endpointUrl": "http://localhost:3000/mock_opportunities_50.json",
  "method": "GET",
  "auth": {
    "type": "none"
  }
}
```

---

## Alternative: Use API Route (Already Created)

I've created an API route at `/api/mock-opportunities` that will serve your file.

### Step 1: Copy file to public folder (same as above)

```powershell
Copy-Item "C:\Users\grace\Downloads\mock_opportunities_50.json" -Destination ".\public\mock_opportunities_50.json"
```

### Step 2: Add to SOURCES_JSON

```json
{
  "source": "mockOpportunities",
  "endpointUrl": "https://your-railway-app.up.railway.app/api/mock-opportunities",
  "method": "GET",
  "auth": {
    "type": "none"
  }
}
```

---

## Complete SOURCES_JSON Example

```json
[
  {
    "source": "grantsGov",
    "endpointUrl": "https://api.grants.gov/v1/api/search2",
    "method": "POST",
    "auth": {
      "type": "none"
    },
    "requestBody": {
      "rows": 100,
      "keyword": "",
      "oppNum": "",
      "eligibilities": "",
      "agencies": "",
      "oppStatuses": "forecasted|posted",
      "aln": "",
      "fundingCategories": ""
    }
  },
  {
    "source": "mockOpportunities",
    "endpointUrl": "https://your-railway-app.up.railway.app/mock_opportunities_50.json",
    "method": "GET",
    "auth": {
      "type": "none"
    }
  }
]
```

---

## Steps to Complete Setup

1. **Copy the file:**
   ```powershell
   Copy-Item "C:\Users\grace\Downloads\mock_opportunities_50.json" -Destination ".\public\mock_opportunities_50.json"
   ```

2. **Update SOURCES_JSON secret:**
   ```bash
   # Edit your SOURCES_JSON to include the mockOpportunities entry
   # Then set the secret:
   firebase functions:secrets:set SOURCES_JSON < sources.json
   ```

3. **Deploy your Next.js app** (so the file/API route is accessible)

4. **Test the endpoint:**
   ```bash
   curl https://your-railway-app.up.railway.app/mock_opportunities_50.json
   ```

5. **Test ingestion:**
   ```bash
   curl -X POST "https://ingestopportunitieshttp-mmmrt6wtlq-uc.a.run.app?sources=mockOpportunities"
   ```

---

## Notes

- The mock opportunities file is already in the correct normalized format
- The ingestion function will automatically parse it as a JSON array
- Make sure to deploy your Next.js app before adding the URL to SOURCES_JSON
- For local testing, use `http://localhost:3000/mock_opportunities_50.json`
