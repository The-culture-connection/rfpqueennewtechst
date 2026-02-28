# Fix SOURCES_JSON Secret - Complete Guide

## The Problem

Your `SOURCES_JSON` secret is incomplete. The logs show:
- `Failed to parse SOURCES_JSON SyntaxError: Unexpected end of JSON input`
- `Raw value preview: [`

This means the secret only contains `[` (opening bracket) instead of a complete JSON array.

## The Solution

### Step 1: Prepare Your Complete JSON

Use the template below or the file `SOURCES_JSON_READY_TO_USE.json`:

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
  }
]
```

### Step 2: Set the Secret (Interactive Method)

```bash
cd functions
firebase functions:secrets:set SOURCES_JSON
```

When prompted:
1. Paste your complete JSON (can be multi-line)
2. Press `Ctrl+Z` then `Enter` on Windows (or `Ctrl+D` on Mac/Linux) when done

### Step 3: Set the Secret (From File)

If you have a `sources.json` file:

```bash
cd functions
firebase functions:secrets:set SOURCES_JSON < sources.json
```

Or using PowerShell:
```powershell
Get-Content sources.json | firebase functions:secrets:set SOURCES_JSON
```

### Step 4: Verify the Secret

```bash
firebase functions:secrets:access SOURCES_JSON
```

You should see your complete JSON array, not just `[`.

### Step 5: Test the Function

```powershell
# Test GET (should show your sources)
Invoke-WebRequest -Uri "https://ingestopportunitieshttp-mmmrt6wtlq-uc.a.run.app" -Method GET -UseBasicParsing

# Test POST (should ingest opportunities)
$body = @{} | ConvertTo-Json
Invoke-WebRequest -Uri "https://ingestopportunitieshttp-mmmrt6wtlq-uc.a.run.app" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

## Common Mistakes

1. **Only pasting `[`** - Make sure you paste the complete JSON array
2. **Invalid JSON** - Validate your JSON at https://jsonlint.com/
3. **Not redeploying** - After setting the secret, the function automatically picks it up (no redeploy needed)

## Testing the Function

### Test GET Request (Debug Info)
```powershell
Invoke-WebRequest -Uri "https://ingestopportunitieshttp-mmmrt6wtlq-uc.a.run.app" -Method GET -UseBasicParsing | Select-Object -ExpandProperty Content
```

Expected response should show your sources:
```json
{
  "message": "Use POST to trigger ingestion. Available sources:",
  "availableSources": ["grantsGov"],
  "sourcesConfig": [...]
}
```

### Test POST Request (Run Ingestion)
```powershell
$body = @{} | ConvertTo-Json
Invoke-WebRequest -Uri "https://ingestopportunitieshttp-mmmrt6wtlq-uc.a.run.app" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing | Select-Object -ExpandProperty Content
```

Expected response:
```json
{
  "success": true,
  "message": "Ingestion completed",
  "totalFetched": 100,
  "totalUpserted": 100,
  ...
}
```

## Next Steps

Once `SOURCES_JSON` is properly set:
1. The function will be able to parse your sources
2. GET request will show available sources
3. POST request will actually fetch and ingest opportunities
