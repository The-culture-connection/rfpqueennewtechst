# Test Ingestion Function Commands

## Function URL
```
https://ingestopportunitieshttp-mmmrt6wtlq-uc.a.run.app
```

## Test Commands

### 1. Test GET Request (Check Available Sources)

**PowerShell:**
```powershell
Invoke-WebRequest -Uri "https://ingestopportunitieshttp-mmmrt6wtlq-uc.a.run.app" -Method GET -UseBasicParsing | Select-Object -ExpandProperty Content
```

**curl (if available):**
```bash
curl https://ingestopportunitieshttp-mmmrt6wtlq-uc.a.run.app
```

**Expected Response:**
```json
{
  "message": "Use POST to trigger ingestion. Available sources:",
  "availableSources": ["grantsGov", "samGov", "simplerGrants", "googleSearch", "localJson"],
  "sourcesConfig": [...],
  "usage": {...}
}
```

---

### 2. Test POST Request (Run Ingestion - All Sources)

**PowerShell:**
```powershell
$body = @{} | ConvertTo-Json
Invoke-WebRequest -Uri "https://ingestopportunitieshttp-mmmrt6wtlq-uc.a.run.app" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing | Select-Object -ExpandProperty Content
```

**curl:**
```bash
curl -X POST https://ingestopportunitieshttp-mmmrt6wtlq-uc.a.run.app \
  -H "Content-Type: application/json" \
  -H "Content-Length: 2" \
  -d "{}"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Ingestion completed",
  "totalFetched": 100,
  "totalUpserted": 50,
  "totalSkipped": 50,
  "sourcesProcessed": ["grantsGov", "localJson"],
  "sourcesSkipped": [],
  "sourcesFailed": [],
  "timestamp": "2026-02-28T..."
}
```

---

### 3. Test POST Request (Specific Sources Only)

**PowerShell:**
```powershell
$body = @{} | ConvertTo-Json
Invoke-WebRequest -Uri "https://ingestopportunitieshttp-mmmrt6wtlq-uc.a.run.app?sources=grantsGov,localJson" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing | Select-Object -ExpandProperty Content
```

**curl:**
```bash
curl -X POST "https://ingestopportunitieshttp-mmmrt6wtlq-uc.a.run.app?sources=grantsGov,localJson" \
  -H "Content-Type: application/json" \
  -H "Content-Length: 2" \
  -d "{}"
```

---

### 4. Test with API Token (if configured)

**PowerShell:**
```powershell
$body = @{} | ConvertTo-Json
$headers = @{
    "Content-Type" = "application/json"
    "X-API-Token" = "YOUR_TOKEN_HERE"
}
Invoke-WebRequest -Uri "https://ingestopportunitieshttp-mmmrt6wtlq-uc.a.run.app" -Method POST -Body $body -Headers $headers -UseBasicParsing | Select-Object -ExpandProperty Content
```

**curl:**
```bash
curl -X POST "https://ingestopportunitieshttp-mmmrt6wtlq-uc.a.run.app?token=YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -H "Content-Length: 2" \
  -d "{}"
```

---

## Quick Test Script (PowerShell)

Save this as `test-ingestion.ps1`:

```powershell
# Test GET
Write-Host "Testing GET request..." -ForegroundColor Cyan
$getResponse = Invoke-WebRequest -Uri "https://ingestopportunitieshttp-mmmrt6wtlq-uc.a.run.app" -Method GET -UseBasicParsing
$getResponse.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
Write-Host "`n" -NoNewline

# Test POST
Write-Host "Testing POST request (all sources)..." -ForegroundColor Cyan
$body = @{} | ConvertTo-Json
$postResponse = Invoke-WebRequest -Uri "https://ingestopportunitieshttp-mmmrt6wtlq-uc.a.run.app" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
$postResponse.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
```

Run it:
```powershell
.\test-ingestion.ps1
```

---

## Check Function Logs

```bash
cd functions
firebase functions:log --only ingestOpportunitiesHttp
```

---

## Troubleshooting

### If you get "availableSources": []
- The SOURCES_JSON secret might not be set correctly
- Check: `firebase functions:secrets:access SOURCES_JSON`

### If you get 0 fetched opportunities
- Check API keys are correct in SOURCES_JSON
- Check endpoint URLs are correct
- Check function logs for specific errors

### If you get 411 error
- Make sure to include `Content-Type: application/json` header
- Include `Content-Length` header or use PowerShell's Invoke-WebRequest (handles it automatically)
