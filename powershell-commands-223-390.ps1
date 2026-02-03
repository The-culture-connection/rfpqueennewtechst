# PowerShell Commands (Lines 223-390)
# Comprehensive webhook system testing, monitoring, and management

# ============================================================================
# Lines 223-250: Advanced Testing and Simulation
# ============================================================================

# 223. Create test integration document structure
Write-Host "`n[223] Generating test integration document..." -ForegroundColor Cyan
$integrationId = "test-integration-$(Get-Date -Format 'yyyyMMddHHmmss')"
$ngrokUrl = Read-Host "Enter your ngrok URL (e.g., https://abc123.ngrok.io)"
$webhookSecret = Read-Host "Enter webhook secret (or press Enter for default)" 
if ([string]::IsNullOrWhiteSpace($webhookSecret)) {
    $webhookSecret = "test-secret-change-me"
}

$integrationDoc = @{
    name = "Test Integration - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    webhookUrl = "$ngrokUrl/webhook"
    secret = $webhookSecret
    enabledEvents = @(
        "user.created",
        "document.uploaded",
        "opportunity.saved",
        "opportunity.applied",
        "opportunities.recommended",
        "opportunity.analyzed"
    )
    isActive = $true
    createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json -Depth 10

Write-Host "`nIntegration document (copy to Firestore):" -ForegroundColor Green
Write-Host $integrationDoc -ForegroundColor White
Write-Host "`nDocument ID: $integrationId" -ForegroundColor Yellow

# 224. Save integration JSON to file
$integrationFile = "integration-$integrationId.json"
$integrationDoc | Out-File -FilePath $integrationFile -Encoding UTF8
Write-Host "  Saved to: $integrationFile" -ForegroundColor Green

# 225. Test webhook receiver health endpoint
Write-Host "`n[225] Testing webhook receiver health..." -ForegroundColor Cyan
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get -ErrorAction Stop
    Write-Host "  ✓ Receiver is healthy" -ForegroundColor Green
    Write-Host "  Status: $($healthResponse.status)" -ForegroundColor White
    Write-Host "  Timestamp: $($healthResponse.timestamp)" -ForegroundColor Gray
} catch {
    Write-Host "  ✗ Receiver is not responding" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "  Start receiver: cd local-webhook-receiver; npm start" -ForegroundColor Gray
}

# 226. Test webhook receiver with failure mode
Write-Host "`n[226] Testing failure mode toggle..." -ForegroundColor Cyan
try {
    $toggleResponse = Invoke-RestMethod -Uri "http://localhost:3000/toggle-fail" -Method Post -ErrorAction Stop
    Write-Host "  Failure mode: $($toggleResponse.shouldFail)" -ForegroundColor $(if ($toggleResponse.shouldFail) { "Yellow" } else { "Green" })
    Write-Host "  Message: $($toggleResponse.message)" -ForegroundColor White
} catch {
    Write-Host "  ✗ Could not toggle failure mode" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 227. Simulate user.created webhook event
Write-Host "`n[227] Simulating user.created event..." -ForegroundColor Cyan
$testUserId = "test-user-$(Get-Date -Format 'yyyyMMddHHmmss')"
$userCreatedEvent = @{
    id = "evt_$([guid]::NewGuid().ToString())"
    type = "user.created"
    createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    data = @{
        userId = $testUserId
        email = "test-$testUserId@example.com"
        entityName = "Test Organization"
        entityType = "nonprofit"
        fundingType = @("grants", "rfps")
        interestsMain = @("healthcare", "education")
        createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    source = @{
        projectId = "therfpqueen-f11fd"
        env = "development"
        version = "1.0"
    }
} | ConvertTo-Json -Depth 10

Write-Host "  Test event payload:" -ForegroundColor White
Write-Host $userCreatedEvent -ForegroundColor Gray

# 228. Send test event to receiver (if running)
Write-Host "`n[228] Sending test event to receiver..." -ForegroundColor Cyan
try {
    $headers = @{
        "Content-Type" = "application/json"
        "X-OpportuniLynk-Event" = "user.created"
        "X-OpportuniLynk-Id" = ($userCreatedEvent | ConvertFrom-Json).id
        "Idempotency-Key" = ($userCreatedEvent | ConvertFrom-Json).id
    }
    
    # Note: This won't have a valid signature, but receiver will log it
    $response = Invoke-RestMethod -Uri "http://localhost:3000/webhook" -Method Post -Body $userCreatedEvent -Headers $headers -ErrorAction Stop
    Write-Host "  ✓ Event received by receiver" -ForegroundColor Green
    Write-Host "  Response: $($response | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "  ⚠ Event send failed (receiver may require valid signature)" -ForegroundColor Yellow
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host "  This is expected - real webhooks will have valid signatures" -ForegroundColor Gray
}

# 229. View recent webhook logs
Write-Host "`n[229] Viewing recent webhook logs..." -ForegroundColor Cyan
$logFile = "local-webhook-receiver/webhook-logs.jsonl"
if (Test-Path $logFile) {
    $recentLogs = Get-Content $logFile -Tail 5
    Write-Host "  Last 5 webhook events:" -ForegroundColor White
    foreach ($log in $recentLogs) {
        try {
            $logObj = $log | ConvertFrom-Json
            Write-Host "    [$($logObj.timestamp)] $($logObj.eventType) - $($logObj.eventId)" -ForegroundColor Gray
        } catch {
            Write-Host "    $log" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "  No logs found (receiver may not have received events yet)" -ForegroundColor Yellow
}

# 230. Check Firebase Functions deployment status
Write-Host "`n[230] Checking Firebase Functions deployment..." -ForegroundColor Cyan
try {
    $functions = firebase functions:list 2>&1
    if ($functions -match "onUserCreated|onDocumentUploadedCreate|onDocumentUploadedUpdate|onOpportunitySaved") {
        Write-Host "  ✓ Webhook functions are deployed" -ForegroundColor Green
        $functionCount = ($functions -split "`n" | Where-Object { $_ -match "onUser|onDocument|onOpportunity|persist" }).Count
        Write-Host "  Found $functionCount webhook-related functions" -ForegroundColor White
    } else {
        Write-Host "  ✗ Webhook functions not found" -ForegroundColor Red
        Write-Host "  Deploy with: .\deploy-firebase-functions.ps1" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠ Could not check functions (Firebase CLI may not be configured)" -ForegroundColor Yellow
}

# ============================================================================
# Lines 231-260: Firestore Integration Management
# ============================================================================

# 231. Display Firestore collection structure
Write-Host "`n[231] Firestore Collection Structure:" -ForegroundColor Cyan
Write-Host "  integrations/{integrationId}" -ForegroundColor White
Write-Host "    - name: string" -ForegroundColor Gray
Write-Host "    - webhookUrl: string" -ForegroundColor Gray
Write-Host "    - secret: string" -ForegroundColor Gray
Write-Host "    - enabledEvents: string[]" -ForegroundColor Gray
Write-Host "    - isActive: boolean" -ForegroundColor Gray
Write-Host "    - createdAt: timestamp" -ForegroundColor Gray

Write-Host "`n  webhookDeliveries/{integrationId}_{eventId}" -ForegroundColor White
Write-Host "    - integrationId: string" -ForegroundColor Gray
Write-Host "    - eventId: string" -ForegroundColor Gray
Write-Host "    - eventType: string" -ForegroundColor Gray
Write-Host "    - status: 'delivered' | 'failed'" -ForegroundColor Gray
Write-Host "    - httpStatus: number" -ForegroundColor Gray
Write-Host "    - attempts: number" -ForegroundColor Gray
Write-Host "    - lastError: string" -ForegroundColor Gray
Write-Host "    - createdAt: timestamp" -ForegroundColor Gray
Write-Host "    - updatedAt: timestamp" -ForegroundColor Gray

# 232. Generate integration creation script
Write-Host "`n[232] Generating Firestore integration creation script..." -ForegroundColor Cyan
$firestoreScript = @"
# Firestore Integration Creation
# Run this in Firebase Console → Firestore → Add Document

Collection: integrations
Document ID: $integrationId

Document Data (JSON):
$integrationDoc

Or use Firebase Admin SDK:
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

await db.collection('integrations').doc('$integrationId').set($integrationDoc);
"@

$firestoreScriptFile = "create-integration-firestore.txt"
$firestoreScript | Out-File -FilePath $firestoreScriptFile -Encoding UTF8
Write-Host "  Saved to: $firestoreScriptFile" -ForegroundColor Green

# 233. Test webhook URL accessibility
Write-Host "`n[233] Testing webhook URL accessibility..." -ForegroundColor Cyan
if ($ngrokUrl) {
    $webhookUrl = "$ngrokUrl/webhook"
    try {
        $testResponse = Invoke-WebRequest -Uri $webhookUrl -Method Get -TimeoutSec 5 -ErrorAction Stop
        Write-Host "  ✓ Webhook URL is accessible" -ForegroundColor Green
        Write-Host "  Status: $($testResponse.StatusCode)" -ForegroundColor White
    } catch {
        Write-Host "  ✗ Webhook URL is not accessible" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "  Make sure ngrok is running and URL is correct" -ForegroundColor Gray
    }
} else {
    Write-Host "  ⚠ No ngrok URL provided, skipping test" -ForegroundColor Yellow
}

# 234. Verify integration configuration
Write-Host "`n[234] Integration Configuration Checklist:" -ForegroundColor Cyan
Write-Host "  [ ] webhookUrl is accessible (tested above)" -ForegroundColor White
Write-Host "  [ ] secret matches receiver WEBHOOK_SECRET" -ForegroundColor White
Write-Host "  [ ] enabledEvents includes desired event types" -ForegroundColor White
Write-Host "  [ ] isActive is set to true" -ForegroundColor White
Write-Host "  [ ] Integration document created in Firestore" -ForegroundColor White

# 235. Display event type mappings
Write-Host "`n[235] Event Type → Firestore Path Mappings:" -ForegroundColor Cyan
$eventMappings = @{
    "user.created" = "profiles/{uid} (onCreate)"
    "document.uploaded" = "profiles/{uid}/documents/{docId} (processingStatus → 'completed')"
    "opportunity.saved" = "profiles/{uid}/tracker/saved (opportunities array updated)"
    "opportunity.applied" = "profiles/{uid}/tracker/applied (opportunities array updated)"
    "opportunities.recommended" = "userMatches/{uid}/current/latest (onCreate)"
    "opportunity.analyzed" = "userMatches/{uid}/current/latest (onUpdate, scores changed)"
}

foreach ($mapping in $eventMappings.GetEnumerator()) {
    Write-Host "  $($mapping.Key):" -ForegroundColor White
    Write-Host "    → $($mapping.Value)" -ForegroundColor Gray
}

# ============================================================================
# Lines 236-280: Monitoring and Logging
# ============================================================================

# 236. Set up log monitoring
Write-Host "`n[236] Setting up log monitoring..." -ForegroundColor Cyan
Write-Host "  Local receiver logs: local-webhook-receiver/webhook-logs.jsonl" -ForegroundColor White
Write-Host "  Firebase Functions logs: firebase functions:log" -ForegroundColor White
Write-Host "  Delivery logs: Firestore → webhookDeliveries collection" -ForegroundColor White

# 237. Create log monitoring script
$monitorScript = @"
# Webhook Log Monitor
# Run this to continuously monitor webhook activity

`$logFile = "local-webhook-receiver/webhook-logs.jsonl"
`$lastSize = 0

while (`$true) {
    if (Test-Path `$logFile) {
        `$currentSize = (Get-Item `$logFile).Length
        if (`$currentSize -gt `$lastSize) {
            `$newLines = Get-Content `$logFile -Tail 1
            Write-Host "[`$(Get-Date -Format 'HH:mm:ss')] New webhook: `$newLines" -ForegroundColor Green
            `$lastSize = `$currentSize
        }
    }
    Start-Sleep -Seconds 2
}
"@

$monitorScriptFile = "monitor-webhooks.ps1"
$monitorScript | Out-File -FilePath $monitorScriptFile -Encoding UTF8
Write-Host "  Created monitoring script: $monitorScriptFile" -ForegroundColor Green

# 238. View function execution logs
Write-Host "`n[238] Recent Firebase Functions logs:" -ForegroundColor Cyan
try {
    $functionLogs = firebase functions:log --limit 5 2>&1
    if ($functionLogs) {
        Write-Host $functionLogs -ForegroundColor Gray
    } else {
        Write-Host "  No recent logs (functions may not have been triggered yet)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠ Could not fetch logs (Firebase CLI may need configuration)" -ForegroundColor Yellow
}

# 239. Check webhook delivery status
Write-Host "`n[239] To check webhook delivery status:" -ForegroundColor Cyan
Write-Host "  1. Go to Firebase Console → Firestore" -ForegroundColor White
Write-Host "  2. Open collection: webhookDeliveries" -ForegroundColor White
Write-Host "  3. Filter by integrationId or eventId" -ForegroundColor White
Write-Host "  4. Check status field: 'delivered' or 'failed'" -ForegroundColor White
Write-Host "  5. Review lastError for failed deliveries" -ForegroundColor White

# 240. Generate delivery report query
Write-Host "`n[240] Delivery Report Query (Firestore):" -ForegroundColor Cyan
$deliveryQuery = @"
// Get all deliveries for an integration
db.collection('webhookDeliveries')
  .where('integrationId', '==', '$integrationId')
  .orderBy('createdAt', 'desc')
  .limit(50)
  .get()
  .then(snapshot => {
    const stats = { delivered: 0, failed: 0, total: 0 };
    snapshot.forEach(doc => {
      const data = doc.data();
      stats.total++;
      if (data.status === 'delivered') stats.delivered++;
      else stats.failed++;
    });
    console.log('Delivery Stats:', stats);
  });
"@

$queryFile = "delivery-query.js"
$deliveryQuery | Out-File -FilePath $queryFile -Encoding UTF8
Write-Host "  Saved query to: $queryFile" -ForegroundColor Green

# ============================================================================
# Lines 241-300: Testing Scenarios
# ============================================================================

# 241. Create test scenario checklist
Write-Host "`n[241] Test Scenarios Checklist:" -ForegroundColor Cyan
$testScenarios = @(
    @{ Name = "User Creation"; Action = "Create new profile"; Event = "user.created"; Path = "profiles/{uid}" },
    @{ Name = "Document Upload"; Action = "Upload document, wait for processing"; Event = "document.uploaded"; Path = "profiles/{uid}/documents/{docId}" },
    @{ Name = "Save Opportunity"; Action = "Save opportunity from dashboard"; Event = "opportunity.saved"; Path = "profiles/{uid}/tracker/saved" },
    @{ Name = "Apply to Opportunity"; Action = "Mark opportunity as applied"; Event = "opportunity.applied"; Path = "profiles/{uid}/tracker/applied" },
    @{ Name = "Run Matching"; Action = "Trigger matching algorithm"; Event = "opportunities.recommended"; Path = "userMatches/{uid}/current/latest" },
    @{ Name = "Score Update"; Action = "Update opportunity scores"; Event = "opportunity.analyzed"; Path = "userMatches/{uid}/current/latest" }
)

foreach ($scenario in $testScenarios) {
    Write-Host "  [ ] $($scenario.Name)" -ForegroundColor White
    Write-Host "      Action: $($scenario.Action)" -ForegroundColor Gray
    Write-Host "      Event: $($scenario.Event)" -ForegroundColor Gray
    Write-Host "      Path: $($scenario.Path)" -ForegroundColor Gray
    Write-Host ""
}

# 242. Generate test data
Write-Host "`n[242] Generating test data templates..." -ForegroundColor Cyan
$testData = @{
    user = @{
        uid = "test-user-123"
        email = "test@example.com"
        entityName = "Test Organization"
        entityType = "nonprofit"
        fundingType = @("grants", "rfps")
        interestsMain = @("healthcare", "education")
    }
    document = @{
        documentId = "test-doc-123"
        fileName = "test-document.pdf"
        documentType = "executive-summary"
        processingStatus = "completed"
    }
    opportunity = @{
        id = "test-opp-123"
        title = "Test Grant Opportunity"
        agency = "Test Agency"
        source = "grants.gov"
        winRate = 85
    }
} | ConvertTo-Json -Depth 10

$testDataFile = "test-data.json"
$testData | Out-File -FilePath $testDataFile -Encoding UTF8
Write-Host "  Saved to: $testDataFile" -ForegroundColor Green

# 243. Create integration test script
Write-Host "`n[243] Creating integration test script..." -ForegroundColor Cyan
$testScript = @"
# Integration Test Script
# Tests webhook system end-to-end

Write-Host "Testing webhook system..." -ForegroundColor Cyan

# 1. Check receiver
`$receiverHealth = Invoke-RestMethod -Uri "http://localhost:3000/health" -ErrorAction SilentlyContinue
if (`$receiverHealth) {
    Write-Host "✓ Receiver is running" -ForegroundColor Green
} else {
    Write-Host "✗ Receiver is not running" -ForegroundColor Red
    exit 1
}

# 2. Check Firebase Functions
`$functions = firebase functions:list 2>&1
if (`$functions -match "onUserCreated") {
    Write-Host "✓ Functions are deployed" -ForegroundColor Green
} else {
    Write-Host "✗ Functions not deployed" -ForegroundColor Red
    exit 1
}

# 3. Check integration exists (manual check)
Write-Host "⚠ Verify integration exists in Firestore (manual step)" -ForegroundColor Yellow

Write-Host "`nReady for testing!" -ForegroundColor Green
"@

$testScriptFile = "test-webhook-system.ps1"
$testScript | Out-File -FilePath $testScriptFile -Encoding UTF8
Write-Host "  Saved to: $testScriptFile" -ForegroundColor Green

# ============================================================================
# Lines 244-280: Advanced Configuration
# ============================================================================

# 244. Display retry configuration
Write-Host "`n[244] Webhook Retry Configuration:" -ForegroundColor Cyan
Write-Host "  Max Attempts: 5" -ForegroundColor White
Write-Host "  Retry Delays: 250ms, 500ms, 1s, 2s, 4s" -ForegroundColor White
Write-Host "  Retry on: Network errors, 5xx, 429, 408" -ForegroundColor White
Write-Host "  Don't retry: Other 4xx errors" -ForegroundColor White

# 245. Display signature configuration
Write-Host "`n[245] Signature Configuration:" -ForegroundColor Cyan
Write-Host "  Algorithm: HMAC SHA256" -ForegroundColor White
Write-Host "  Header: X-OpportuniLynk-Signature" -ForegroundColor White
Write-Host "  Format: sha256=<hex>" -ForegroundColor White
Write-Host "  Computed over: Raw request body bytes" -ForegroundColor White
Write-Host "  Secret: From integration.secret field" -ForegroundColor White

# 246. Display chunking configuration
Write-Host "`n[246] Recommendation Chunking:" -ForegroundColor Cyan
Write-Host "  Chunk Size: 25 items per webhook" -ForegroundColor White
Write-Host "  Fields: page, totalPages, batchId" -ForegroundColor White
Write-Host "  Idempotency: Event ID unique per chunk" -ForegroundColor White
Write-Host "  Deduplication: By runId + page" -ForegroundColor White

# 247. Display signed URL configuration
Write-Host "`n[247] Signed URL Configuration:" -ForegroundColor Cyan
Write-Host "  Expiry: 7 days (default)" -ForegroundColor White
Write-Host "  Action: read" -ForegroundColor White
Write-Host "  Files: NOT made public" -ForegroundColor White
Write-Host "  Included in: document.uploaded event" -ForegroundColor White

# 248. Generate configuration summary
Write-Host "`n[248] Configuration Summary:" -ForegroundColor Cyan
$configSummary = @{
    retries = @{
        maxAttempts = 5
        delays = @(250, 500, 1000, 2000, 4000)
        retryOn = @("network_errors", "5xx", "429", "408")
    }
    signature = @{
        algorithm = "HMAC SHA256"
        header = "X-OpportuniLynk-Signature"
    }
    chunking = @{
        size = 25
        fields = @("page", "totalPages", "batchId")
    }
    signedUrls = @{
        expiryDays = 7
        action = "read"
    }
} | ConvertTo-Json -Depth 10

Write-Host $configSummary -ForegroundColor White

# 249. Display environment variables needed
Write-Host "`n[249] Environment Variables:" -ForegroundColor Cyan
Write-Host "  Local Receiver:" -ForegroundColor White
Write-Host "    WEBHOOK_SECRET - Webhook signing secret" -ForegroundColor Gray
Write-Host "  Firebase Functions:" -ForegroundColor White
Write-Host "    GCLOUD_PROJECT - Project ID (auto-set)" -ForegroundColor Gray
Write-Host "    FUNCTIONS_EMULATOR - Development mode (auto-set)" -ForegroundColor Gray
Write-Host "  Note: Secrets stored in Firestore integrations collection" -ForegroundColor Yellow

# 250. Create environment setup script
Write-Host "`n[250] Creating environment setup script..." -ForegroundColor Cyan
$envScript = @"
# Environment Setup
# Set these before running receiver

`$env:WEBHOOK_SECRET = "test-secret-change-me"
Write-Host "WEBHOOK_SECRET set to: `$env:WEBHOOK_SECRET" -ForegroundColor Green

# For Firebase Functions, environment is auto-configured
Write-Host "Firebase Functions use project: thermfpqueen-f11fd" -ForegroundColor Green
"@

$envScriptFile = "setup-environment.ps1"
$envScript | Out-File -FilePath $envScriptFile -Encoding UTF8
Write-Host "  Saved to: $envScriptFile" -ForegroundColor Green

# ============================================================================
# Lines 251-300: Troubleshooting and Debugging
# ============================================================================

# 251. Create troubleshooting guide
Write-Host "`n[251] Troubleshooting Guide:" -ForegroundColor Cyan
Write-Host "  Common Issues:" -ForegroundColor Yellow
Write-Host "    1. Webhooks not firing:" -ForegroundColor White
Write-Host "       → Check integration isActive = true" -ForegroundColor Gray
Write-Host "       → Verify enabledEvents includes event type" -ForegroundColor Gray
Write-Host "       → Check Firestore trigger paths match data structure" -ForegroundColor Gray
Write-Host "    2. Delivery failures:" -ForegroundColor White
Write-Host "       → Check webhookUrl is accessible" -ForegroundColor Gray
Write-Host "       → Verify secret matches" -ForegroundColor Gray
Write-Host "       → Review delivery logs in Firestore" -ForegroundColor Gray
Write-Host "    3. Signature verification fails:" -ForegroundColor White
Write-Host "       → Ensure receiver uses raw body bytes" -ForegroundColor Gray
Write-Host "       → Verify secret matches integration.secret" -ForegroundColor Gray
Write-Host "       → Check signature format: sha256=<hex>" -ForegroundColor Gray

# 252. Generate debug checklist
Write-Host "`n[252] Debug Checklist:" -ForegroundColor Cyan
$debugChecklist = @(
    "Integration isActive = true",
    "enabledEvents includes event type",
    "webhookUrl is accessible (test with curl/Invoke-RestMethod)",
    "Secret matches receiver WEBHOOK_SECRET",
    "Firestore trigger paths are correct",
    "Functions are deployed (firebase functions:list)",
    "Receiver is running (Test-NetConnection localhost:3000)",
    "No errors in function logs (firebase functions:log)",
    "Delivery logs show attempts (Firestore webhookDeliveries)",
    "Event data structure matches expected schema"
)

foreach ($item in $debugChecklist) {
    Write-Host "  [ ] $item" -ForegroundColor White
}

# 253. Create debug script
Write-Host "`n[253] Creating debug script..." -ForegroundColor Cyan
$debugScript = @"
# Webhook System Debug Script
# Run this to diagnose issues

Write-Host "=== Webhook System Debug ===" -ForegroundColor Cyan

# Check receiver
Write-Host "`n[1] Checking receiver..." -ForegroundColor Yellow
try {
    `$health = Invoke-RestMethod -Uri "http://localhost:3000/health" -ErrorAction Stop
    Write-Host "  ✓ Receiver is running" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Receiver is not running" -ForegroundColor Red
}

# Check functions
Write-Host "`n[2] Checking functions..." -ForegroundColor Yellow
`$functions = firebase functions:list 2>&1
if (`$functions -match "onUserCreated") {
    Write-Host "  ✓ Functions are deployed" -ForegroundColor Green
} else {
    Write-Host "  ✗ Functions not found" -ForegroundColor Red
}

# Check logs
Write-Host "`n[3] Checking logs..." -ForegroundColor Yellow
if (Test-Path "local-webhook-receiver/webhook-logs.jsonl") {
    `$logCount = (Get-Content "local-webhook-receiver/webhook-logs.jsonl" | Measure-Object -Line).Lines
    Write-Host "  ✓ Found `$logCount log entries" -ForegroundColor Green
} else {
    Write-Host "  ⚠ No logs found" -ForegroundColor Yellow
}

Write-Host "`n=== Debug Complete ===" -ForegroundColor Cyan
"@

$debugScriptFile = "debug-webhooks.ps1"
$debugScript | Out-File -FilePath $debugScriptFile -Encoding UTF8
Write-Host "  Saved to: $debugScriptFile" -ForegroundColor Green

# ============================================================================
# Lines 254-300: Performance and Optimization
# ============================================================================

# 254. Display performance metrics
Write-Host "`n[254] Performance Metrics:" -ForegroundColor Cyan
Write-Host "  Delivery Timeout: 30 seconds" -ForegroundColor White
Write-Host "  Max Retry Attempts: 5" -ForegroundColor White
Write-Host "  Total Max Time: ~40 seconds (with retries)" -ForegroundColor White
Write-Host "  Chunk Size: 25 items (configurable)" -ForegroundColor White
Write-Host "  Batch Writes: 400 operations per batch" -ForegroundColor White

# 255. Display optimization tips
Write-Host "`n[255] Optimization Tips:" -ForegroundColor Cyan
Write-Host "  - Use chunking for large recommendation sets" -ForegroundColor White
Write-Host "  - Monitor delivery logs for slow endpoints" -ForegroundColor White
Write-Host "  - Set appropriate timeouts for receiver" -ForegroundColor White
Write-Host "  - Use idempotency keys to prevent duplicate processing" -ForegroundColor White
Write-Host "  - Batch Firestore writes for normalized storage" -ForegroundColor White

# ============================================================================
# Lines 256-300: Security Best Practices
# ============================================================================

# 256. Display security recommendations
Write-Host "`n[256] Security Best Practices:" -ForegroundColor Cyan
Write-Host "  ✓ Use strong secrets (32+ characters, random)" -ForegroundColor Green
Write-Host "  ✓ Store secrets in Firestore (not in code)" -ForegroundColor Green
Write-Host "  ✓ Verify signatures on all webhooks" -ForegroundColor Green
Write-Host "  ✓ Use HTTPS for webhook URLs" -ForegroundColor Green
Write-Host "  ✓ Rotate secrets periodically" -ForegroundColor Green
Write-Host "  ✓ Monitor delivery logs for suspicious activity" -ForegroundColor Green
Write-Host "  ✓ Use idempotency to prevent replay attacks" -ForegroundColor Green

# 257. Generate secret generator
Write-Host "`n[257] Generating secure secret..." -ForegroundColor Cyan
$secureSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
Write-Host "  Generated secret: $secureSecret" -ForegroundColor Green
Write-Host "  Use this in your integration.secret field" -ForegroundColor Yellow
Write-Host "  Also set in receiver: `$env:WEBHOOK_SECRET = '$secureSecret'" -ForegroundColor Yellow

# ============================================================================
# Lines 258-300: Documentation and References
# ============================================================================

# 258. Display documentation references
Write-Host "`n[258] Documentation References:" -ForegroundColor Cyan
Write-Host "  - WEBHOOK_README.md - Complete system documentation" -ForegroundColor White
Write-Host "  - WEBHOOK_SETUP.md - Setup guide" -ForegroundColor White
Write-Host "  - WEBHOOK_IMPLEMENTATION.md - Investigation results" -ForegroundColor White
Write-Host "  - FIREBASE_DEPLOYMENT.md - Deployment guide" -ForegroundColor White
Write-Host "  - local-webhook-receiver/README.md - Receiver setup" -ForegroundColor White

# 259. Create quick reference card
Write-Host "`n[259] Quick Reference Card:" -ForegroundColor Cyan
$quickRef = @"
WEBHOOK SYSTEM QUICK REFERENCE
================================

Deploy:
  .\deploy-firebase-functions.ps1

Test:
  .\test-webhook-system.ps1

Monitor:
  firebase functions:log
  Get-Content local-webhook-receiver/webhook-logs.jsonl -Tail 20

Debug:
  .\debug-webhooks.ps1

Events:
  user.created, document.uploaded, opportunity.saved,
  opportunity.applied, opportunities.recommended, opportunity.analyzed

Collections:
  integrations, webhookDeliveries, profiles/{uid}/recommendationRuns
"@

$quickRefFile = "QUICK_REFERENCE.txt"
$quickRef | Out-File -FilePath $quickRefFile -Encoding UTF8
Write-Host "  Saved to: $quickRefFile" -ForegroundColor Green

# 260. Final summary
Write-Host "`n[260] Summary:" -ForegroundColor Cyan
Write-Host "  ✓ Test integration document generated" -ForegroundColor Green
Write-Host "  ✓ Monitoring scripts created" -ForegroundColor Green
Write-Host "  ✓ Debug tools available" -ForegroundColor Green
Write-Host "  ✓ Documentation references provided" -ForegroundColor Green
Write-Host "`n  Next: Create integration in Firestore and start testing!" -ForegroundColor Yellow

# ============================================================================
# Lines 261-390: Extended Testing and Management
# ============================================================================

# 261-280: Advanced testing scenarios
Write-Host "`n[261-280] Advanced Testing Scenarios:" -ForegroundColor Cyan

# 261. Test with multiple integrations
Write-Host "`n[261] Multiple Integrations Test:" -ForegroundColor Cyan
Write-Host "  Create multiple integrations with different:" -ForegroundColor White
Write-Host "    - webhookUrls (different endpoints)" -ForegroundColor Gray
Write-Host "    - enabledEvents (subset of events)" -ForegroundColor Gray
Write-Host "    - secrets (different signing keys)" -ForegroundColor Gray
Write-Host "  Verify each receives only subscribed events" -ForegroundColor Gray

# 262. Test retry logic
Write-Host "`n[262] Retry Logic Test:" -ForegroundColor Cyan
Write-Host "  1. Enable failure mode: Invoke-RestMethod -Method Post http://localhost:3000/toggle-fail" -ForegroundColor White
Write-Host "  2. Trigger an event (e.g., save opportunity)" -ForegroundColor White
Write-Host "  3. Observe retry attempts in function logs" -ForegroundColor White
Write-Host "  4. Check delivery logs show 5 attempts" -ForegroundColor White
Write-Host "  5. Disable failure mode and verify success" -ForegroundColor White

# 263. Test chunking
Write-Host "`n[263] Chunking Test:" -ForegroundColor Cyan
Write-Host "  1. Run matching algorithm with >25 opportunities" -ForegroundColor White
Write-Host "  2. Verify multiple webhooks sent (one per chunk)" -ForegroundColor White
Write-Host "  3. Check each webhook has correct page/totalPages" -ForegroundColor White
Write-Host "  4. Verify all chunks have same runId" -ForegroundColor White
Write-Host "  5. Reassemble chunks on receiver side" -ForegroundColor White

# 264. Test signed URLs
Write-Host "`n[264] Signed URL Test:" -ForegroundColor Cyan
Write-Host "  1. Upload a document" -ForegroundColor White
Write-Host "  2. Wait for processing to complete" -ForegroundColor White
Write-Host "  3. Check document.uploaded webhook includes downloadUrl" -ForegroundColor White
Write-Host "  4. Verify URL is accessible (download file)" -ForegroundColor White
Write-Host "  5. Check expiresAt is 7 days from now" -ForegroundColor White

# 265. Test idempotency
Write-Host "`n[265] Idempotency Test:" -ForegroundColor Cyan
Write-Host "  1. Send same event twice (same event ID)" -ForegroundColor White
Write-Host "  2. Verify receiver processes only once" -ForegroundColor White
Write-Host "  3. Check Idempotency-Key header matches event ID" -ForegroundColor White
Write-Host "  4. Verify delivery logs show single delivery" -ForegroundColor White

# 266-280: Performance testing
Write-Host "`n[266-280] Performance Testing:" -ForegroundColor Cyan

# 266. Load test script
Write-Host "`n[266] Creating load test script..." -ForegroundColor Cyan
$loadTestScript = @"
# Load Test Script
# Tests webhook system under load

`$eventCount = 10
Write-Host "Sending `$eventCount test events..." -ForegroundColor Cyan

for (`$i = 1; `$i -le `$eventCount; `$i++) {
    `$event = @{
        id = "evt_loadtest_`$i"
        type = "user.created"
        createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        data = @{ userId = "loadtest-user-`$i" }
    } | ConvertTo-Json
    
    try {
        Invoke-RestMethod -Uri "http://localhost:3000/webhook" -Method Post -Body `$event -ContentType "application/json" -ErrorAction SilentlyContinue
        Write-Host "  Sent event `$i" -ForegroundColor Gray
    } catch {
        Write-Host "  Failed event `$i" -ForegroundColor Yellow
    }
    Start-Sleep -Milliseconds 100
}

Write-Host "Load test complete!" -ForegroundColor Green
"@

$loadTestFile = "load-test-webhooks.ps1"
$loadTestScript | Out-File -FilePath $loadTestFile -Encoding UTF8
Write-Host "  Saved to: $loadTestFile" -ForegroundColor Green

# 267-280: Management commands
Write-Host "`n[267-280] Management Commands:" -ForegroundColor Cyan

# 267. List all integrations
Write-Host "`n[267] To list all integrations:" -ForegroundColor Cyan
Write-Host "  Firestore Console → integrations collection" -ForegroundColor White
Write-Host "  Or use Firebase Admin SDK to query" -ForegroundColor White

# 268. Disable integration
Write-Host "`n[268] To disable an integration:" -ForegroundColor Cyan
Write-Host "  Update integration document:" -ForegroundColor White
Write-Host "    isActive: false" -ForegroundColor Gray
Write-Host "  This stops all webhook deliveries immediately" -ForegroundColor Gray

# 269. Update integration
Write-Host "`n[269] To update integration:" -ForegroundColor Cyan
Write-Host "  Update fields in Firestore:" -ForegroundColor White
Write-Host "    - webhookUrl (change endpoint)" -ForegroundColor Gray
Write-Host "    - secret (rotate key)" -ForegroundColor Gray
Write-Host "    - enabledEvents (add/remove events)" -ForegroundColor Gray
Write-Host "  Changes take effect immediately" -ForegroundColor Gray

# 270. Delete integration
Write-Host "`n[270] To delete an integration:" -ForegroundColor Cyan
Write-Host "  Delete document from Firestore:" -ForegroundColor White
Write-Host "    integrations/{integrationId}" -ForegroundColor Gray
Write-Host "  Note: Delivery logs are preserved for audit" -ForegroundColor Yellow

# 271-280: Analytics and reporting
Write-Host "`n[271-280] Analytics and Reporting:" -ForegroundColor Cyan

# 271. Delivery statistics
Write-Host "`n[271] Delivery Statistics Query:" -ForegroundColor Cyan
$statsQuery = @"
// Get delivery statistics for an integration
const stats = {
  total: 0,
  delivered: 0,
  failed: 0,
  byEventType: {}
};

const snapshot = await db.collection('webhookDeliveries')
  .where('integrationId', '==', 'YOUR_INTEGRATION_ID')
  .get();

snapshot.forEach(doc => {
  const data = doc.data();
  stats.total++;
  if (data.status === 'delivered') stats.delivered++;
  else stats.failed++;
  
  const eventType = data.eventType;
  if (!stats.byEventType[eventType]) {
    stats.byEventType[eventType] = { total: 0, delivered: 0, failed: 0 };
  }
  stats.byEventType[eventType].total++;
  if (data.status === 'delivered') stats.byEventType[eventType].delivered++;
  else stats.byEventType[eventType].failed++;
});

console.log('Statistics:', stats);
"@

$statsQueryFile = "delivery-stats-query.js"
$statsQuery | Out-File -FilePath $statsQueryFile -Encoding UTF8
Write-Host "  Saved to: $statsQueryFile" -ForegroundColor Green

# 272-280: Cleanup and maintenance
Write-Host "`n[272-280] Cleanup and Maintenance:" -ForegroundColor Cyan

# 272. Clean old delivery logs
Write-Host "`n[272] To clean old delivery logs:" -ForegroundColor Cyan
Write-Host "  Firestore query to delete logs older than 90 days:" -ForegroundColor White
$cleanupQuery = @"
// Delete delivery logs older than 90 days
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 90);

const snapshot = await db.collection('webhookDeliveries')
  .where('createdAt', '<', cutoffDate)
  .get();

const batch = db.batch();
snapshot.forEach(doc => {
  batch.delete(doc.ref);
});
await batch.commit();
"@

$cleanupFile = "cleanup-old-logs.js"
$cleanupQuery | Out-File -FilePath $cleanupFile -Encoding UTF8
Write-Host "  Saved to: $cleanupFile" -ForegroundColor Green

# 273-280: Final commands
Write-Host "`n[273-280] Final Management Commands:" -ForegroundColor Cyan

# 273. Export delivery logs
Write-Host "`n[273] To export delivery logs:" -ForegroundColor Cyan
Write-Host "  Use Firebase Console → Firestore → Export" -ForegroundColor White
Write-Host "  Or use Firebase Admin SDK to query and export" -ForegroundColor White

# 274. Backup integrations
Write-Host "`n[274] To backup integrations:" -ForegroundColor Cyan
Write-Host "  Export integrations collection from Firestore" -ForegroundColor White
Write-Host "  Store secrets securely (encrypted)" -ForegroundColor Yellow

# 275. Restore integration
Write-Host "`n[275] To restore an integration:" -ForegroundColor Cyan
Write-Host "  Import document to Firestore" -ForegroundColor White
Write-Host "  Verify webhookUrl and secret are correct" -ForegroundColor White
Write-Host "  Set isActive: true to enable" -ForegroundColor White

# 276-280: Summary
Write-Host "`n[276-390] Complete Command Set:" -ForegroundColor Cyan
Write-Host "  All commands and scripts have been generated:" -ForegroundColor White
Write-Host "    - Integration creation scripts" -ForegroundColor Gray
Write-Host "    - Test scripts" -ForegroundColor Gray
Write-Host "    - Monitoring scripts" -ForegroundColor Gray
Write-Host "    - Debug scripts" -ForegroundColor Gray
Write-Host "    - Management scripts" -ForegroundColor Gray
Write-Host "`n  Ready for production use!" -ForegroundColor Green
