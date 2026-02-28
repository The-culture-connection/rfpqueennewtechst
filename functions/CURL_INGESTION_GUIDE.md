# Curl Function for Opportunity Ingestion

## New HTTP Function

I've added `ingestOpportunitiesHttp` - an HTTP endpoint you can call directly with curl!

## Quick Start

### Check Available Sources (GET)

```bash
curl https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp
```

Returns list of configured sources and usage examples.

### Basic Usage - All Sources (No Auth)

```bash
curl -X POST https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp
```

### Select Specific Sources

```bash
# Run only grantsGov and samGov
curl -X POST "https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp?sources=grantsGov,samGov"

# Run only simplerGrants
curl -X POST "https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp?sources=simplerGrants"

# Run multiple sources
curl -X POST "https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp?sources=grantsGov,samGov,simplerGrants,googleSearch"
```

**Your Function URL:** `https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp`

### With API Token (Optional)

If you want to protect the endpoint, set an API token as an environment variable:

```bash
# Option 1: Set in Firebase Console (Functions → Configuration → Environment variables)
# Add: INGESTION_API_TOKEN = your-secret-token-123

# Option 2: Set as secret (requires code update to use defineSecret)
firebase functions:secrets:set INGESTION_API_TOKEN
# Enter your token when prompted (e.g., "my-secret-token-123")
```

Then call with token:

```bash
# Option 1: Query parameter
curl -X POST "https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp?token=my-secret-token-123"

# Option 2: Header
curl -X POST https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp \
  -H "X-API-Token: my-secret-token-123"
```

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Ingestion completed",
  "totalFetched": 150,
  "totalUpserted": 120,
  "totalSkipped": 30,
  "sourcesProcessed": ["grantsGov", "samGov"],
  "sourcesSkipped": ["simplerGrants"],
  "sourcesFailed": [],
  "debug": {
    "allSources": ["grantsGov", "samGov", "simplerGrants", "googleSearch"],
    "sourcesConfig": [
      {
        "source": "grantsGov",
        "endpointUrl": "https://api.example.com/opportunities",
        "hasAuth": true
      }
    ]
  },
  "timestamp": "2026-02-04T12:00:00.000Z"
}
```

### Error Response

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API token. Provide ?token=YOUR_TOKEN or X-API-Token header."
}
```

## Deploy

```bash
cd functions
firebase deploy --only functions:ingestOpportunitiesHttp
```

## Examples

### Windows PowerShell

```powershell
# Basic call
Invoke-WebRequest -Uri "https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp" -Method POST

# With token
Invoke-WebRequest -Uri "https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp?token=your-token" -Method POST
```

### Linux/Mac

```bash
# Basic call
curl -X POST https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp

# With token (query param)
curl -X POST "https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp?token=your-token"

# With token (header)
curl -X POST https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp \
  -H "X-API-Token: your-token"

# Pretty print JSON response
curl -X POST https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp | jq
```

## Security

- **Without token**: Anyone with the URL can trigger ingestion
- **With token**: Only requests with the correct token can trigger ingestion
- **Recommendation**: Set `INGESTION_API_TOKEN` secret for production use

## Notes

- Function timeout: 9 minutes
- Only POST requests are allowed
- CORS is enabled (can be called from web browsers)
- The function uses the same `SOURCES_JSON` secret as the scheduled function
