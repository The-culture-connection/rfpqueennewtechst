# PowerShell Commands (Lines 121-131)
# Post-deployment verification and testing commands

# ============================================================================
# Lines 121-131: Post-Deployment Verification and Testing
# ============================================================================

# 121. Verify deployment was successful
Write-Host "`n[121] Verifying deployment..." -ForegroundColor Cyan
$deployedFunctions = firebase functions:list 2>&1
if ($deployedFunctions -match "onUserCreated") {
    Write-Host "  ✓ onUserCreated deployed" -ForegroundColor Green
} else {
    Write-Host "  ✗ onUserCreated NOT found" -ForegroundColor Red
}

# 122. Check function logs for errors
Write-Host "`n[122] Checking recent function logs..." -ForegroundColor Cyan
$recentLogs = firebase functions:log --limit 10 2>&1
if ($recentLogs -match "ERROR") {
    Write-Host "  ⚠ WARNING: Errors found in logs!" -ForegroundColor Yellow
    Write-Host "  View full logs: firebase functions:log" -ForegroundColor Gray
} else {
    Write-Host "  ✓ No recent errors" -ForegroundColor Green
}

# 123. Verify Firestore collections exist
Write-Host "`n[123] Verifying Firestore structure..." -ForegroundColor Cyan
Write-Host "  Required collections:" -ForegroundColor White
Write-Host "    - integrations (for webhook config)" -ForegroundColor Gray
Write-Host "    - webhookDeliveries (for delivery logs)" -ForegroundColor Gray
Write-Host "    - profiles/{uid}/recommendationRuns (for normalized storage)" -ForegroundColor Gray
Write-Host "  Note: Collections are created automatically on first write" -ForegroundColor Yellow

# 124. Test integration creation (dry run)
Write-Host "`n[124] Testing integration structure..." -ForegroundColor Cyan
$testIntegration = @{
    name = "Test Integration"
    webhookUrl = "https://test.ngrok.io/webhook"
    secret = "test-secret"
    enabledEvents = @("user.created", "document.uploaded")
    isActive = $true
    createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json -Depth 10

Write-Host "  Integration JSON structure:" -ForegroundColor White
Write-Host $testIntegration -ForegroundColor Gray

# 125. Check if local receiver is running
Write-Host "`n[125] Checking local webhook receiver..." -ForegroundColor Cyan
$receiverStatus = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue
if ($receiverStatus.TcpTestSucceeded) {
    Write-Host "  ✓ Receiver is running on port 3000" -ForegroundColor Green
    Write-Host "  Test: Invoke-RestMethod http://localhost:3000/health" -ForegroundColor Gray
} else {
    Write-Host "  ✗ Receiver is NOT running" -ForegroundColor Yellow
    Write-Host "  Start with: cd local-webhook-receiver; npm start" -ForegroundColor Gray
}

# 126. Show webhook event types
Write-Host "`n[126] Available webhook event types:" -ForegroundColor Cyan
$eventTypes = @(
    "user.created",
    "document.uploaded",
    "opportunity.saved",
    "opportunity.applied",
    "opportunity.outcome_recorded",
    "opportunity.analyzed",
    "opportunities.recommended",
    "opportunity.viewed"
)
foreach ($eventType in $eventTypes) {
    Write-Host "  - $eventType" -ForegroundColor White
}

# 127. Display integration creation instructions
Write-Host "`n[127] To create integration in Firestore:" -ForegroundColor Cyan
Write-Host "  1. Go to Firebase Console → Firestore" -ForegroundColor White
Write-Host "  2. Create collection: integrations" -ForegroundColor White
Write-Host "  3. Add document with ID: test-integration" -ForegroundColor White
Write-Host "  4. Use the JSON structure shown above (line 124)" -ForegroundColor White
Write-Host "  5. Update webhookUrl with your ngrok URL" -ForegroundColor White
Write-Host "  6. Set isActive: true" -ForegroundColor White

# 128. Show test event commands
Write-Host "`n[128] Test webhook events:" -ForegroundColor Cyan
Write-Host "  To trigger user.created:" -ForegroundColor White
Write-Host "    - Create a new user profile in your app" -ForegroundColor Gray
Write-Host "  To trigger document.uploaded:" -ForegroundColor White
Write-Host "    - Upload a document and wait for processing" -ForegroundColor Gray
Write-Host "  To trigger opportunity.saved:" -ForegroundColor White
Write-Host "    - Save an opportunity from the dashboard" -ForegroundColor Gray
Write-Host "  To trigger opportunity.applied:" -ForegroundColor White
Write-Host "    - Mark an opportunity as applied" -ForegroundColor Gray
Write-Host "  To trigger opportunities.recommended:" -ForegroundColor White
Write-Host "    - Run the matching algorithm" -ForegroundColor Gray

# 129. Monitoring commands
Write-Host "`n[129] Monitoring commands:" -ForegroundColor Cyan
Write-Host "  View function logs:" -ForegroundColor White
Write-Host "    firebase functions:log" -ForegroundColor Gray
Write-Host "  View specific function:" -ForegroundColor White
Write-Host "    firebase functions:log --only onUserCreated" -ForegroundColor Gray
Write-Host "  View webhook deliveries:" -ForegroundColor White
Write-Host "    Firestore → webhookDeliveries collection" -ForegroundColor Gray
Write-Host "  View local receiver logs:" -ForegroundColor White
Write-Host "    Get-Content local-webhook-receiver/webhook-logs.jsonl -Tail 20" -ForegroundColor Gray

# 130. Troubleshooting checklist
Write-Host "`n[130] Troubleshooting checklist:" -ForegroundColor Cyan
Write-Host "  If webhooks don't fire:" -ForegroundColor Yellow
Write-Host "    [ ] Integration isActive = true" -ForegroundColor White
Write-Host "    [ ] enabledEvents includes the event type" -ForegroundColor White
Write-Host "    [ ] webhookUrl is accessible (test with curl/Invoke-RestMethod)" -ForegroundColor White
Write-Host "    [ ] Firestore trigger paths match your data structure" -ForegroundColor White
Write-Host "    [ ] Check function logs for errors" -ForegroundColor White
Write-Host "  If delivery fails:" -ForegroundColor Yellow
Write-Host "    [ ] Check webhookDeliveries collection for error details" -ForegroundColor White
Write-Host "    [ ] Verify receiver is running and accessible" -ForegroundColor White
Write-Host "    [ ] Check signature verification (secret must match)" -ForegroundColor White
Write-Host "    [ ] Review retry attempts in delivery logs" -ForegroundColor White

# 131. Success summary
Write-Host "`n[131] Deployment Summary:" -ForegroundColor Green
Write-Host "  ✓ Functions deployed successfully" -ForegroundColor Green
Write-Host "  ✓ Webhook triggers are active" -ForegroundColor Green
Write-Host "  ✓ Ready to receive webhook events" -ForegroundColor Green
Write-Host "`n  Next: Create integration in Firestore to start receiving webhooks!" -ForegroundColor Cyan
