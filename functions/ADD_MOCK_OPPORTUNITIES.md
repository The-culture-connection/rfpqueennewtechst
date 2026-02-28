# Adding Mock Opportunities to SOURCES_JSON

You have a local JSON file at `C:\Users\grace\Downloads\mock_opportunities_50.json` that you want to integrate into the ingestion system.

## Option 1: Use Next.js API Route (Recommended)

I've created an API route that serves your mock opportunities file. Here's how to use it:

### Step 1: Move the file to your project

Move or copy the file to your project directory:

```powershell
# Copy the file to your project
Copy-Item "C:\Users\grace\Downloads\mock_opportunities_50.json" -Destination ".\public\mock_opportunities_50.json"
```

Or keep it in Downloads and update the API route path.

### Step 2: Add to SOURCES_JSON

Add this entry to your `SOURCES_JSON` configuration:

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

**For local development**, use:
```json
{
  "source": "mockOpportunities",
  "endpointUrl": "http://localhost:3000/api/mock-opportunities",
  "method": "GET",
  "auth": {
    "type": "none"
  }
}
```

### Step 3: Deploy

1. Deploy your Next.js app (so the API route is available)
2. Update your `SOURCES_JSON` secret with the new entry
3. Test the ingestion function

---

## Option 2: Upload to Firebase Storage

### Step 1: Upload to Firebase Storage

```bash
# Using Firebase CLI
firebase storage:upload "C:\Users\grace\Downloads\mock_opportunities_50.json" /mock-opportunities/mock_opportunities_50.json
```

### Step 2: Get Public URL

Get the public download URL from Firebase Console:
- Go to Firebase Console → Storage
- Find the file: `mock-opportunities/mock_opportunities_50.json`
- Copy the download URL

### Step 3: Add to SOURCES_JSON

```json
{
  "source": "mockOpportunities",
  "endpointUrl": "https://firebasestorage.googleapis.com/v0/b/YOUR-PROJECT.appspot.com/o/mock-opportunities%2Fmock_opportunities_50.json?alt=media",
  "method": "GET",
  "auth": {
    "type": "none"
  }
}
```

---

## Option 3: Host on GitHub/GitLab (Public)

1. Upload the file to a public repository
2. Get the raw file URL (e.g., `https://raw.githubusercontent.com/user/repo/main/mock_opportunities_50.json`)
3. Add to SOURCES_JSON:

```json
{
  "source": "mockOpportunities",
  "endpointUrl": "https://raw.githubusercontent.com/user/repo/main/mock_opportunities_50.json",
  "method": "GET",
  "auth": {
    "type": "none"
  }
}
```

---

## Complete SOURCES_JSON Example

Here's a complete example with Grants.gov and mock opportunities:

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
    "endpointUrl": "https://your-railway-app.up.railway.app/api/mock-opportunities",
    "method": "GET",
    "auth": {
      "type": "none"
    }
  }
]
```

---

## Testing

After adding to SOURCES_JSON:

1. **Test the API route directly:**
   ```bash
   curl https://your-railway-app.up.railway.app/api/mock-opportunities
   ```

2. **Test ingestion with mock source:**
   ```bash
   curl -X POST "https://ingestopportunitieshttp-mmmrt6wtlq-uc.a.run.app?sources=mockOpportunities"
   ```

3. **Check logs:**
   ```bash
   firebase functions:log --only ingestOpportunitiesHttp
   ```

---

## Notes

- The mock opportunities file is already in the normalized format, so the ingestion function should handle it correctly
- The API route I created will serve the file as a JSON array
- Make sure the API route is deployed before adding it to SOURCES_JSON
- For local testing, use `http://localhost:3000/api/mock-opportunities`
