# Fix SOURCES_JSON Secret

## Problem

Your `SOURCES_JSON` secret is incomplete - it only contains `[` (opening bracket). The logs show:
- `length: 1` - Only 1 character!
- `Failed to parse SOURCES_JSON SyntaxError: Unexpected end of JSON input`

## Solution: Re-set the Secret

### Step 1: Prepare Your JSON

Create a complete JSON array with all your sources. Use this template:

```json
[
  {
    "source": "grantsGov",
    "endpointUrl": "https://api.grants.gov/v1/opportunities",
    "auth": {
      "type": "apiKey",
      "queryParam": "api_key",
      "token": "your-grants-gov-api-key"
    }
  },
  {
    "source": "samGov",
    "endpointUrl": "https://api.sam.gov/opportunities",
    "auth": {
      "type": "apiKey",
      "headerName": "X-API-Key",
      "token": "your-sam-gov-api-key"
    }
  },
  {
    "source": "simplerGrants",
    "endpointUrl": "https://api.simpler.grants.gov/opportunities",
    "auth": {
      "type": "bearer",
      "token": "your-bearer-token"
    }
  },
  {
    "source": "googleSearch",
    "endpointUrl": "https://www.googleapis.com/customsearch/v1",
    "auth": {
      "type": "apiKey",
      "queryParam": "key",
      "token": "your-google-api-key"
    }
  },
  {
    "source": "localJson",
    "endpointUrl": "https://your-domain.com/api/opportunities.json",
    "auth": {
      "type": "none"
    }
  }
]
```

### Step 2: Set the Secret

**Option A: Interactive (Recommended)**

```bash
firebase functions:secrets:set SOURCES_JSON
```

When prompted:
1. Paste your **complete JSON** (can be multi-line)
2. Press **Enter** after pasting
3. Press **Ctrl+D** (Linux/Mac) or **Ctrl+Z then Enter** (Windows) to finish

**Option B: From File**

1. Save your JSON to a file (e.g., `sources.json`)
2. Run:
```bash
firebase functions:secrets:set SOURCES_JSON < sources.json
```

### Step 3: Verify

After setting, test the function:

```powershell
# Check what sources are configured
Invoke-WebRequest -Uri "https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp" -UseBasicParsing
```

You should see all 5 sources listed in the response.

## Important Notes

1. **Complete JSON**: Make sure your JSON is complete and valid
2. **No trailing commas**: JSON doesn't allow trailing commas
3. **Proper escaping**: If your URLs or tokens contain special characters, they'll be auto-escaped
4. **Single-line vs Multi-line**: You can paste multi-line JSON when using interactive mode

## Quick Test

After setting the secret, test with:

```powershell
# Test all sources
Invoke-WebRequest -Uri "https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp" -Method POST -UseBasicParsing

# Test just one source
Invoke-WebRequest -Uri "https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp?sources=grantsGov" -Method POST -UseBasicParsing
```

## Troubleshooting

### Still getting "Unexpected end of JSON input"?

1. **Validate your JSON**: Use https://jsonlint.com/ to check
2. **Check secret value**: 
   ```bash
   firebase functions:secrets:access SOURCES_JSON
   ```
3. **Redeploy function** (secrets are available immediately, but if issues persist):
   ```bash
   firebase deploy --only functions:ingestOpportunitiesHttp
   ```

### Secret not updating?

- Secrets update immediately, no redeploy needed
- If issues persist, check logs: `firebase functions:log --only ingestOpportunitiesHttp`
