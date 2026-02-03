# PowerShell Commands for Webhook System Setup and Testing
# Run these commands in PowerShell (Windows) or PowerShell Core (cross-platform)

# ============================================================================
# 1. LOCAL WEBHOOK RECEIVER SETUP
# ============================================================================

# Install dependencies for local receiver
Write-Host "Installing local webhook receiver dependencies..." -ForegroundColor Cyan
Set-Location local-webhook-receiver
npm install
Set-Location ..

# Start local receiver (in background)
Write-Host "Starting local webhook receiver on port 3000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd local-webhook-receiver; npm start"

# ============================================================================
# 2. NGROK SETUP (if installed)
# ============================================================================

# Start ngrok (replace with your actual ngrok path)
# $ngrokPath = "C:\Users\YourName\AppData\Local\ngrok\ngrok.exe"
# Start-Process $ngrokPath -ArgumentList "http", "3000"

# Or if ngrok is in PATH:
# Start-Process ngrok -ArgumentList "http", "3000"

Write-Host "`nTo expose with ngrok, run:" -ForegroundColor Yellow
Write-Host "  ngrok http 3000" -ForegroundColor White
Write-Host "`nThen copy the ngrok URL (e.g., https://abc123.ngrok.io)" -ForegroundColor Yellow

# ============================================================================
# 3. CREATE INTEGRATION IN FIRESTORE
# ============================================================================

# Set your ngrok URL here
$ngrokUrl = "https://YOUR-NGROK-URL.ngrok.io"
$webhookSecret = "test-secret-change-me"

# Integration document data
$integrationData = @{
    name = "Local Test Integration"
    webhookUrl = "$ngrokUrl/webhook"
    secret = $webhookSecret
    enabledEvents = @(
        "user.created",
        "document.uploaded",
        "opportunity.saved",
        "opportunity.applied",
        "opportunities.recommended"
    )
    isActive = $true
    createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json -Depth 10

Write-Host "`nIntegration data (copy to Firestore console):" -ForegroundColor Cyan
Write-Host $integrationData -ForegroundColor White

Write-Host "`nTo create in Firestore:" -ForegroundColor Yellow
Write-Host "1. Go to Firebase Console > Firestore" -ForegroundColor White
Write-Host "2. Create collection: integrations" -ForegroundColor White
Write-Host "3. Add document with ID: test-integration" -ForegroundColor White
Write-Host "4. Paste the JSON above" -ForegroundColor White

# ============================================================================
# 4. TEST WEBHOOK ENDPOINTS
# ============================================================================

# Test health endpoint
Write-Host "`nTesting health endpoint..." -ForegroundColor Cyan
$healthResponse = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
Write-Host ($healthResponse | ConvertTo-Json) -ForegroundColor Green

# Toggle failure mode (to test retries)
Write-Host "`nToggle failure mode (to test retries)..." -ForegroundColor Cyan
$toggleResponse = Invoke-RestMethod -Uri "http://localhost:3000/toggle-fail" -Method Post
Write-Host ($toggleResponse | ConvertTo-Json) -ForegroundColor Yellow

# ============================================================================
# 5. FIREBASE FUNCTIONS DEPLOYMENT
# ============================================================================

Write-Host "`nTo deploy Firebase Functions:" -ForegroundColor Cyan
Write-Host "  cd functions" -ForegroundColor White
Write-Host "  npm install" -ForegroundColor White
Write-Host "  npm run build" -ForegroundColor White
Write-Host "  firebase deploy --only functions" -ForegroundColor White

# ============================================================================
# 6. VIEW LOGS
# ============================================================================

Write-Host "`nTo view webhook logs:" -ForegroundColor Cyan
Write-Host "  Get-Content local-webhook-receiver/webhook-logs.jsonl -Tail 20" -ForegroundColor White

Write-Host "`nTo view Firebase Functions logs:" -ForegroundColor Cyan
Write-Host "  firebase functions:log" -ForegroundColor White

# ============================================================================
# 7. CREATE TEST INTEGRATION VIA FIRESTORE REST API
# ============================================================================

# If you have Firebase Admin SDK or REST API access, you can create programmatically
# Replace with your actual project ID and credentials
$projectId = "therfpqueen-f11fd"
$collectionPath = "integrations"
$documentId = "test-integration"

Write-Host "`nTo create integration via REST API:" -ForegroundColor Cyan
Write-Host "  Use Firebase Admin SDK or REST API with proper authentication" -ForegroundColor White
Write-Host "  Collection: $collectionPath" -ForegroundColor White
Write-Host "  Document ID: $documentId" -ForegroundColor White

# ============================================================================
# 8. MONITOR WEBHOOK DELIVERIES
# ============================================================================

Write-Host "`nTo monitor webhook deliveries in Firestore:" -ForegroundColor Cyan
Write-Host "  Collection: webhookDeliveries" -ForegroundColor White
Write-Host "  Query by integrationId or eventId" -ForegroundColor White

# ============================================================================
# 9. TEST WEBHOOK MANUALLY (Simulate Event)
# ============================================================================

# Example: Simulate a user.created event
$testEvent = @{
    id = "evt_test_$(Get-Date -Format 'yyyyMMddHHmmss')"
    type = "user.created"
    createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    data = @{
        userId = "test-user-123"
        email = "test@example.com"
        entityName = "Test Corp"
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

Write-Host "`nTest event payload (for manual testing):" -ForegroundColor Cyan
Write-Host $testEvent -ForegroundColor White

# ============================================================================
# 10. USEFUL COMMANDS
# ============================================================================

Write-Host "`n=== Useful Commands ===" -ForegroundColor Green
Write-Host "`nView webhook logs (last 10):" -ForegroundColor Yellow
Write-Host "  Get-Content local-webhook-receiver/webhook-logs.jsonl -Tail 10" -ForegroundColor White

Write-Host "`nClear webhook logs:" -ForegroundColor Yellow
Write-Host "  Clear-Content local-webhook-receiver/webhook-logs.jsonl" -ForegroundColor White

Write-Host "`nCheck if receiver is running:" -ForegroundColor Yellow
Write-Host "  Test-NetConnection -ComputerName localhost -Port 3000" -ForegroundColor White

Write-Host "`nStop all Node processes (if needed):" -ForegroundColor Yellow
Write-Host "  Get-Process node | Stop-Process" -ForegroundColor White

Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update `$ngrokUrl variable with your ngrok URL" -ForegroundColor White
Write-Host "2. Create integration in Firestore (use JSON above)" -ForegroundColor White
Write-Host "3. Trigger events in your app" -ForegroundColor White
Write-Host "4. Monitor logs in webhook-logs.jsonl" -ForegroundColor White
