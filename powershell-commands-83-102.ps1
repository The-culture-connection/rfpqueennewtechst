# PowerShell Commands (Lines 83-102)
# Specific commands for webhook system deployment and testing

# ============================================================================
# Lines 83-102: Deployment and Verification Commands
# ============================================================================

# 83. Navigate to functions directory
Set-Location functions

# 84. Clean previous build (optional, removes old compiled files)
Write-Host "Cleaning previous build..." -ForegroundColor Yellow
if (Test-Path "lib") {
    Remove-Item -Recurse -Force lib
    Write-Host "  Removed lib directory" -ForegroundColor Green
}

# 85. Install dependencies (ensures all packages are up to date)
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed!" -ForegroundColor Red
    exit 1
}

# 86. Build TypeScript to JavaScript
Write-Host "Building TypeScript..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed! Check TypeScript errors above." -ForegroundColor Red
    exit 1
}

# 87. Verify build output exists
Write-Host "Verifying build output..." -ForegroundColor Yellow
$buildFiles = @(
    "lib/index.js",
    "lib/webhook/eventTypes.js",
    "lib/webhook/triggers.js"
)

foreach ($file in $buildFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file (MISSING)" -ForegroundColor Red
    }
}

# 88. Check Firebase CLI is available
Write-Host "Checking Firebase CLI..." -ForegroundColor Yellow
$firebaseCheck = firebase --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Firebase CLI: $firebaseCheck" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Firebase CLI not found!" -ForegroundColor Red
    Write-Host "  Install with: npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# 89. Verify Firebase project is selected
Write-Host "Checking Firebase project..." -ForegroundColor Yellow
$currentProject = firebase use 2>&1
if ($currentProject -match "therfpqueen-f11fd") {
    Write-Host "  Project: thermfpqueen-f11fd" -ForegroundColor Green
} else {
    Write-Host "  Current: $currentProject" -ForegroundColor Yellow
    Write-Host "  Setting project to thermfpqueen-f11fd..." -ForegroundColor Yellow
    firebase use thermfpqueen-f11fd
}

# 90. Show what will be deployed
Write-Host "`nFunctions to deploy:" -ForegroundColor Cyan
Write-Host "  - onUserCreated" -ForegroundColor White
Write-Host "  - onDocumentUploadedCreate" -ForegroundColor White
Write-Host "  - onDocumentUploadedUpdate" -ForegroundColor White
Write-Host "  - onOpportunitySaved" -ForegroundColor White
Write-Host "  - onOpportunityApplied" -ForegroundColor White
Write-Host "  - onOpportunitiesRecommended" -ForegroundColor White
Write-Host "  - onOpportunityAnalyzed" -ForegroundColor White
Write-Host "  - persistRecommendations" -ForegroundColor White

# 91. Confirm deployment
Write-Host "`nReady to deploy. Press Enter to continue or Ctrl+C to cancel..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# 92. Deploy functions
Write-Host "`nDeploying functions..." -ForegroundColor Cyan
Write-Host "  This may take 5-10 minutes for first deployment..." -ForegroundColor Gray
firebase deploy --only functions

# 93. Check deployment status
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Deployment successful!" -ForegroundColor Green
} else {
    Write-Host "`n✗ Deployment failed!" -ForegroundColor Red
    Write-Host "  Check error messages above." -ForegroundColor Yellow
    exit 1
}

# 94. List deployed functions
Write-Host "`nDeployed functions:" -ForegroundColor Cyan
firebase functions:list

# 95. Show function URLs (if available)
Write-Host "`nFunction endpoints:" -ForegroundColor Cyan
Write-Host "  Webhook triggers are Firestore triggers (no HTTP endpoints)" -ForegroundColor Gray
Write-Host "  They fire automatically on Firestore changes" -ForegroundColor Gray

# 96. Return to project root
Set-Location ..

# 97. Show next steps
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# 98. Next steps instructions
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Create integration in Firestore:" -ForegroundColor White
Write-Host "   Collection: integrations" -ForegroundColor Gray
Write-Host "   Document ID: test-integration" -ForegroundColor Gray
Write-Host "   See WEBHOOK_SETUP.md for JSON structure" -ForegroundColor Gray

Write-Host "`n2. Test webhook triggers:" -ForegroundColor White
Write-Host "   - Create a user profile → user.created" -ForegroundColor Gray
Write-Host "   - Upload a document → document.uploaded" -ForegroundColor Gray
Write-Host "   - Save an opportunity → opportunity.saved" -ForegroundColor Gray
Write-Host "   - Apply to opportunity → opportunity.applied" -ForegroundColor Gray
Write-Host "   - Run matching → opportunities.recommended" -ForegroundColor Gray

# 99. Monitoring commands
Write-Host "`n3. Monitor webhook delivery:" -ForegroundColor White
Write-Host "   View logs: firebase functions:log" -ForegroundColor Gray
Write-Host "   Check deliveries: Firestore → webhookDeliveries collection" -ForegroundColor Gray

# 100. Troubleshooting
Write-Host "`n4. If webhooks don't fire:" -ForegroundColor White
Write-Host "   - Check integration isActive: true" -ForegroundColor Gray
Write-Host "   - Verify enabledEvents includes event type" -ForegroundColor Gray
Write-Host "   - Check Firestore trigger logs" -ForegroundColor Gray
Write-Host "   - Verify webhookUrl is accessible" -ForegroundColor Gray

# 101. View logs command
Write-Host "`nTo view function logs:" -ForegroundColor Cyan
Write-Host "  firebase functions:log" -ForegroundColor White
Write-Host "  firebase functions:log --only onUserCreated" -ForegroundColor White

# 102. Success message
Write-Host "`n✓ Webhook system is now deployed and ready!" -ForegroundColor Green
Write-Host "  Create an integration to start receiving webhooks." -ForegroundColor Gray
