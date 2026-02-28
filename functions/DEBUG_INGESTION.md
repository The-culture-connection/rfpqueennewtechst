# Debugging Opportunity Ingestion

## Quick Debug Steps

### Step 1: Check Available Sources

```bash
# GET request shows all configured sources
curl https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp
```

This will show:
- All available source names
- Their endpoint URLs
- Whether they have auth configured

### Step 2: Test Individual Sources

```bash
# Test just one source
curl -X POST "https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp?sources=grantsGov"

# Test multiple sources
curl -X POST "https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp?sources=grantsGov,samGov"
```

### Step 3: Check Function Logs

```bash
firebase functions:log --only ingestOpportunitiesHttp
```

Look for:
- `[Ingestion] Total sources configured: X`
- `[Ingestion] Available sources: ...`
- `[Ingestion] Fetched X items from source=...`
- Any error messages

## Common Issues

### Issue: `totalFetched: 0`

**Possible Causes:**

1. **SOURCES_JSON not configured**
   - Check logs for: `SOURCES_JSON not configured`
   - Solution: Set the secret: `firebase functions:secrets:set SOURCES_JSON`

2. **Sources configured but endpoints return empty arrays**
   - Check logs for: `Fetched 0 items from source=...`
   - Solution: Verify your API endpoints are returning data
   - Test endpoints directly with curl

3. **Authentication failures**
   - Check logs for: `HTTP 401` or `HTTP 403`
   - Solution: Verify API tokens/keys are correct in SOURCES_JSON

4. **Wrong source names in filter**
   - Check available sources with GET request
   - Source names are case-sensitive
   - Use exact names from your config

### Issue: Sources not found

**Check:**
```bash
# See what sources are configured
curl https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp
```

**Solution:**
- Verify source names match exactly (case-sensitive)
- Check SOURCES_JSON secret is set correctly
- Ensure JSON is valid

## Example: Your Sources

Based on your list:
- `grantsGov`
- `samGov` (or `samGov`)
- `simplerGrants` (or `simplerGrants`)
- `googleSearch`
- `localJson` (when ready)

### Test Commands

```bash
# Test all sources
curl -X POST https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp

# Test just grantsGov
curl -X POST "https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp?sources=grantsGov"

# Test grantsGov and samGov
curl -X POST "https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp?sources=grantsGov,samGov"

# Test all except one
curl -X POST "https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp?sources=grantsGov,samGov,simplerGrants,googleSearch"
```

## PowerShell Examples

```powershell
# Check available sources
Invoke-WebRequest -Uri "https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp" -UseBasicParsing

# Run all sources
Invoke-WebRequest -Uri "https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp" -Method POST -UseBasicParsing

# Run specific sources
Invoke-WebRequest -Uri "https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp?sources=grantsGov,samGov" -Method POST -UseBasicParsing
```

## Response Format

### Success with Debug Info

```json
{
  "success": true,
  "message": "Ingestion completed",
  "totalFetched": 150,
  "totalUpserted": 120,
  "totalSkipped": 30,
  "sourcesProcessed": ["grantsGov", "samGov"],
  "sourcesSkipped": [],
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
  "timestamp": "2026-02-28T00:22:38.394Z"
}
```

### No Sources Configured

```json
{
  "success": true,
  "message": "Ingestion completed",
  "totalFetched": 0,
  "totalUpserted": 0,
  "totalSkipped": 0,
  "sourcesProcessed": [],
  "sourcesSkipped": [],
  "sourcesFailed": [],
  "debug": {
    "allSources": [],
    "sourcesConfig": []
  },
  "timestamp": "2026-02-28T00:22:38.394Z"
}
```

If `allSources` is empty, your SOURCES_JSON secret is not configured or is empty.

## Next Steps

1. **Check available sources**: GET request to see what's configured
2. **Check logs**: `firebase functions:log --only ingestOpportunitiesHttp`
3. **Test individual sources**: Use `?sources=sourceName` parameter
4. **Verify SOURCES_JSON**: Make sure secret is set correctly
5. **Test API endpoints directly**: Verify they return data
