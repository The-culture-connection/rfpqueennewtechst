# PowerShell Commands (Lines 828-843)
# Deployment verification and post-deployment testing

# ============================================================================
# Lines 828-843: Post-Deployment Verification and Testing
# ============================================================================

# 828. Verify deployment completed successfully
Write-Host "`n[828] Verifying deployment completion..." -ForegroundColor Cyan
try {
    $deployResult = firebase deploy --only functions --dry-run 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Deployment configuration is valid" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Deployment check completed with warnings" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠ Could not verify deployment config" -ForegroundColor Yellow
}

# 829. List all deployed webhook functions
Write-Host "`n[829] Listing deployed webhook functions..." -ForegroundColor Cyan
$webhookFunctions = @(
    "onUserCreated",
    "onDocumentUploadedCreate",
    "onDocumentUploadedUpdate",
    "onOpportunitySaved",
    "onOpportunityApplied",
    "onOpportunityAnalyzed",
    "onOpportunitiesRecommended",
    "persistRecommendations"
)

Write-Host "  Expected webhook functions:" -ForegroundColor White
foreach ($func in $webhookFunctions) {
    Write-Host "    - $func" -ForegroundColor Gray
}

# 830. Check function deployment status
Write-Host "`n[830] Checking function deployment status..." -ForegroundColor Cyan
try {
    $deployedFunctions = firebase functions:list 2>&1
    $deployedCount = 0
    foreach ($func in $webhookFunctions) {
        if ($deployedFunctions -match $func) {
            Write-Host "  ✓ $func is deployed" -ForegroundColor Green
            $deployedCount++
        } else {
            Write-Host "  ✗ $func is NOT deployed" -ForegroundColor Red
        }
    }
    Write-Host "`n  Deployed: $deployedCount / $($webhookFunctions.Count)" -ForegroundColor $(if ($deployedCount -eq $webhookFunctions.Count) { "Green" } else { "Yellow" })
} catch {
    Write-Host "  ⚠ Could not check deployment status" -ForegroundColor Yellow
    Write-Host "  Run: firebase functions:list" -ForegroundColor Gray
}

# 831. Verify Firestore trigger paths
Write-Host "`n[831] Verifying Firestore trigger paths..." -ForegroundColor Cyan
$triggerPaths = @{
    "onUserCreated" = "profiles/{userId}"
    "onDocumentUploadedCreate" = "profiles/{userId}/documents/{documentId}"
    "onDocumentUploadedUpdate" = "profiles/{userId}/documents/{documentId}"
    "onOpportunitySaved" = "profiles/{userId}/tracker/saved"
    "onOpportunityApplied" = "profiles/{userId}/tracker/applied"
    "onOpportunityAnalyzed" = "userMatches/{userId}/current/latest"
    "onOpportunitiesRecommended" = "userMatches/{userId}/current/latest"
    "persistRecommendations" = "userMatches/{userId}/current/latest"
}

Write-Host "  Trigger paths:" -ForegroundColor White
foreach ($func in $webhookFunctions) {
    if ($triggerPaths.ContainsKey($func)) {
        Write-Host "    $func → $($triggerPaths[$func])" -ForegroundColor Gray
    }
}

# 832. Test webhook trigger (simulate Firestore write)
Write-Host "`n[832] To test webhook triggers:" -ForegroundColor Cyan
Write-Host "  1. Create a test user profile in Firestore:" -ForegroundColor White
Write-Host "     Collection: profiles" -ForegroundColor Gray
Write-Host "     Document ID: test-user-123" -ForegroundColor Gray
Write-Host "     Data: { email: 'test@example.com', entityName: 'Test', createdAt: new Date() }" -ForegroundColor Gray
Write-Host "     Expected: onUserCreated webhook should fire" -ForegroundColor Gray

Write-Host "`n  2. Upload a document and wait for processing:" -ForegroundColor White
Write-Host "     Collection: profiles/{uid}/documents" -ForegroundColor Gray
Write-Host "     Update processingStatus to 'completed'" -ForegroundColor Gray
Write-Host "     Expected: onDocumentUploadedUpdate webhook should fire" -ForegroundColor Gray

Write-Host "`n  3. Save an opportunity:" -ForegroundColor White
Write-Host "     Collection: profiles/{uid}/tracker/saved" -ForegroundColor Gray
Write-Host "     Add opportunity to opportunities array" -ForegroundColor Gray
Write-Host "     Expected: onOpportunitySaved webhook should fire" -ForegroundColor Gray

# 833. Monitor function execution
Write-Host "`n[833] Monitoring function execution..." -ForegroundColor Cyan
Write-Host "  To view real-time logs:" -ForegroundColor White
Write-Host "    firebase functions:log --only onUserCreated" -ForegroundColor Gray
Write-Host "    firebase functions:log --only onDocumentUploadedCreate" -ForegroundColor Gray
Write-Host "    firebase functions:log --only onOpportunitySaved" -ForegroundColor Gray
Write-Host "`n  Or view all webhook function logs:" -ForegroundColor White
Write-Host "    firebase functions:log | Select-String 'Webhook|onUser|onDocument|onOpportunity'" -ForegroundColor Gray

# 834. Check webhook delivery logs
Write-Host "`n[834] Checking webhook delivery logs..." -ForegroundColor Cyan
Write-Host "  Firestore Collection: webhookDeliveries" -ForegroundColor White
Write-Host "  Query recent deliveries:" -ForegroundColor Gray
Write-Host "    - Filter by integrationId" -ForegroundColor Gray
Write-Host "    - Filter by eventType" -ForegroundColor Gray
Write-Host "    - Sort by createdAt desc" -ForegroundColor Gray
Write-Host "  Check status field: 'delivered' or 'failed'" -ForegroundColor Gray

# 835. Verify integration is configured
Write-Host "`n[835] Verify integration configuration:" -ForegroundColor Cyan
Write-Host "  [ ] Integration document exists in Firestore" -ForegroundColor White
Write-Host "  [ ] isActive = true" -ForegroundColor White
Write-Host "  [ ] webhookUrl is accessible" -ForegroundColor White
Write-Host "  [ ] secret matches receiver WEBHOOK_SECRET" -ForegroundColor White
Write-Host "  [ ] enabledEvents includes desired event types" -ForegroundColor White

# 836. Test webhook delivery end-to-end
Write-Host "`n[836] End-to-End Test Procedure:" -ForegroundColor Cyan
Write-Host "  1. Ensure local receiver is running:" -ForegroundColor White
Write-Host "     cd local-webhook-receiver" -ForegroundColor Gray
Write-Host "     npm start" -ForegroundColor Gray

Write-Host "`n  2. Expose receiver with ngrok:" -ForegroundColor White
Write-Host "     ngrok http 3000" -ForegroundColor Gray
Write-Host "     Copy the ngrok URL" -ForegroundColor Gray

Write-Host "`n  3. Create/update integration in Firestore:" -ForegroundColor White
Write-Host "     webhookUrl = 'https://YOUR-NGROK-URL.ngrok.io/webhook'" -ForegroundColor Gray
Write-Host "     secret = 'test-secret-change-me' (match receiver)" -ForegroundColor Gray
Write-Host "     isActive = true" -ForegroundColor Gray

Write-Host "`n  4. Trigger a test event (e.g., create user profile)" -ForegroundColor White

Write-Host "`n  5. Verify webhook received:" -ForegroundColor White
Write-Host "     - Check receiver logs: Get-Content webhook-logs.jsonl -Tail 5" -ForegroundColor Gray
Write-Host "     - Check delivery logs in Firestore: webhookDeliveries collection" -ForegroundColor Gray
Write-Host "     - Check function logs: firebase functions:log" -ForegroundColor Gray

# 837. Performance check
Write-Host "`n[837] Performance Check:" -ForegroundColor Cyan
Write-Host "  Expected delivery time: < 2 seconds" -ForegroundColor White
Write-Host "  Expected success rate: > 95%" -ForegroundColor White
Write-Host "  Monitor:" -ForegroundColor White
Write-Host "    - Function execution time in logs" -ForegroundColor Gray
Write-Host "    - Delivery time in webhookDeliveries" -ForegroundColor Gray
Write-Host "    - Receiver response time" -ForegroundColor Gray

# 838. Troubleshooting deployment issues
Write-Host "`n[838] If deployment fails:" -ForegroundColor Cyan
Write-Host "  1. Check build errors:" -ForegroundColor White
Write-Host "     cd functions && npm run build" -ForegroundColor Gray
Write-Host "     Fix any TypeScript errors" -ForegroundColor Gray

Write-Host "`n  2. Check Firebase CLI:" -ForegroundColor White
Write-Host "     firebase --version" -ForegroundColor Gray
Write-Host "     firebase login" -ForegroundColor Gray
Write-Host "     firebase use thermfpqueen-f11fd" -ForegroundColor Gray

Write-Host "`n  3. Check permissions:" -ForegroundColor White
Write-Host "     - Verify you have 'Firebase Admin' or 'Editor' role" -ForegroundColor Gray
Write-Host "     - Check Firebase Console → IAM & Admin" -ForegroundColor Gray

Write-Host "`n  4. Check function quotas:" -ForegroundColor White
Write-Host "     - Verify no quota limits exceeded" -ForegroundColor Gray
Write-Host "     - Check Firebase Console → Functions → Usage" -ForegroundColor Gray

# 839. Verify function URLs (if applicable)
Write-Host "`n[839] Function Endpoints:" -ForegroundColor Cyan
Write-Host "  Note: Firestore triggers don't have HTTP endpoints" -ForegroundColor White
Write-Host "  They fire automatically on Firestore document changes" -ForegroundColor Gray
Write-Host "  To view trigger configuration:" -ForegroundColor White
Write-Host "    firebase functions:config:get" -ForegroundColor Gray
Write-Host "    Or check Firebase Console → Functions" -ForegroundColor Gray

# 840. Create deployment verification script
Write-Host "`n[840] Creating deployment verification script..." -ForegroundColor Cyan
$verifyScript = @"
# Deployment Verification Script
# Verifies webhook functions are deployed and configured correctly

Write-Host "=== Deployment Verification ===" -ForegroundColor Cyan

# Check functions are deployed
Write-Host "`n[1] Checking deployed functions..." -ForegroundColor Yellow
`$functions = firebase functions:list 2>&1
`$webhookFunctions = @(
    "onUserCreated",
    "onDocumentUploadedCreate",
    "onDocumentUploadedUpdate",
    "onOpportunitySaved",
    "onOpportunityApplied",
    "onOpportunityAnalyzed",
    "onOpportunitiesRecommended",
    "persistRecommendations"
)

`$deployed = 0
foreach (`$func in `$webhookFunctions) {
    if (`$functions -match `$func) {
        Write-Host "  ✓ `$func" -ForegroundColor Green
        `$deployed++
    } else {
        Write-Host "  ✗ `$func (NOT FOUND)" -ForegroundColor Red
    }
}

Write-Host "`n  Result: `$deployed / `$(`$webhookFunctions.Count) functions deployed" -ForegroundColor $(if (`$deployed -eq `$webhookFunctions.Count) { "Green" } else { "Yellow" })

# Check integration exists
Write-Host "`n[2] Checking integration configuration..." -ForegroundColor Yellow
Write-Host "  ⚠ Manual check required:" -ForegroundColor White
Write-Host "    - Go to Firebase Console → Firestore" -ForegroundColor Gray
Write-Host "    - Check integrations collection exists" -ForegroundColor Gray
Write-Host "    - Verify at least one integration has isActive = true" -ForegroundColor Gray

# Check receiver (if local)
Write-Host "`n[3] Checking local receiver..." -ForegroundColor Yellow
try {
    `$health = Invoke-RestMethod -Uri "http://localhost:3000/health" -ErrorAction SilentlyContinue
    if (`$health) {
        Write-Host "  ✓ Local receiver is running" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Local receiver is not running (optional for production)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠ Local receiver is not running (optional for production)" -ForegroundColor Yellow
}

Write-Host "`n=== Verification Complete ===" -ForegroundColor Cyan
"@

$verifyFile = "verify-deployment.ps1"
$verifyScript | Out-File -FilePath $verifyFile -Encoding UTF8
Write-Host "  Saved to: $verifyFile" -ForegroundColor Green

# 841. Deployment rollback procedure
Write-Host "`n[841] Rollback Procedure:" -ForegroundColor Cyan
Write-Host "  If deployment causes issues:" -ForegroundColor White
Write-Host "    1. Identify the problematic function" -ForegroundColor Gray
Write-Host "    2. Check function logs: firebase functions:log --only FUNCTION_NAME" -ForegroundColor Gray
Write-Host "    3. Fix the issue in code" -ForegroundColor Gray
Write-Host "    4. Redeploy: firebase deploy --only functions:FUNCTION_NAME" -ForegroundColor Gray
Write-Host "    5. Or redeploy all: firebase deploy --only functions" -ForegroundColor Gray
Write-Host "    6. Monitor logs after redeploy" -ForegroundColor Gray

# 842. Post-deployment monitoring
Write-Host "`n[842] Post-Deployment Monitoring:" -ForegroundColor Cyan
Write-Host "  First 24 hours:" -ForegroundColor White
Write-Host "    - Monitor function logs every hour" -ForegroundColor Gray
Write-Host "    - Check webhook delivery success rate" -ForegroundColor Gray
Write-Host "    - Verify no errors in delivery logs" -ForegroundColor Gray
Write-Host "    - Test each webhook event type" -ForegroundColor Gray

Write-Host "`n  Ongoing:" -ForegroundColor White
Write-Host "    - Review delivery logs daily" -ForegroundColor Gray
Write-Host "    - Monitor function execution metrics" -ForegroundColor Gray
Write-Host "    - Check for failed deliveries" -ForegroundColor Gray
Write-Host "    - Review performance metrics weekly" -ForegroundColor Gray

# 843. Success confirmation
Write-Host "`n[843] Deployment Success Checklist:" -ForegroundColor Cyan
$successChecklist = @(
    "All webhook functions deployed (firebase functions:list)",
    "No TypeScript compilation errors (npm run build)",
    "Integration configured in Firestore",
    "Receiver is accessible (test webhookUrl)",
    "Test event triggers webhook successfully",
    "Delivery logs show successful delivery",
    "No errors in function logs"
)

foreach ($item in $successChecklist) {
    Write-Host "  [ ] $item" -ForegroundColor White
}

Write-Host "`n=== Complete ===" -ForegroundColor Green
Write-Host "  Run: .\verify-deployment.ps1 to verify deployment" -ForegroundColor Cyan
