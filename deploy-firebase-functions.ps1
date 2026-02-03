# PowerShell Script to Deploy Firebase Functions
# This script handles building and deploying the webhook system functions

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Firebase Functions Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "functions")) {
    Write-Host "ERROR: 'functions' directory not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory." -ForegroundColor Yellow
    exit 1
}

# Navigate to functions directory
Set-Location functions

Write-Host "[1/5] Checking Node.js version..." -ForegroundColor Yellow
$nodeVersion = node --version
Write-Host "  Node.js version: $nodeVersion" -ForegroundColor Green

# Check if Node.js 22+ is installed
$nodeMajorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
if ($nodeMajorVersion -lt 22) {
    Write-Host "WARNING: Node.js 22+ recommended. Current: $nodeVersion" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

Write-Host ""
Write-Host "[2/5] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Dependencies installed successfully" -ForegroundColor Green

Write-Host ""
Write-Host "[3/5] Building TypeScript..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: TypeScript build failed!" -ForegroundColor Red
    Write-Host "Check for TypeScript errors above." -ForegroundColor Yellow
    exit 1
}
Write-Host "  Build completed successfully" -ForegroundColor Green

# Check if lib/index.js exists (compiled output)
if (-not (Test-Path "lib/index.js")) {
    Write-Host "WARNING: lib/index.js not found after build!" -ForegroundColor Yellow
    Write-Host "  This might mean the build didn't complete properly." -ForegroundColor Yellow
    $continue = Read-Host "Continue with deployment anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
} else {
    Write-Host "  Compiled output found: lib/index.js" -ForegroundColor Green
}

Write-Host ""
Write-Host "[4/5] Checking Firebase CLI..." -ForegroundColor Yellow
$firebaseVersion = firebase --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Firebase CLI not found!" -ForegroundColor Red
    Write-Host "  Install with: npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}
Write-Host "  Firebase CLI version: $firebaseVersion" -ForegroundColor Green

Write-Host ""
Write-Host "[5/5] Deploying functions..." -ForegroundColor Yellow
Write-Host "  This may take several minutes..." -ForegroundColor Gray

# Deploy only functions
firebase deploy --only functions

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Deployment failed!" -ForegroundColor Red
    Write-Host "  Check the error messages above." -ForegroundColor Yellow
    Write-Host ""
    
    # Check for Eventarc permission errors
    $deployOutput = firebase deploy --only functions 2>&1 | Out-String
    if ($deployOutput -match "Eventarc Service Agent" -or $deployOutput -match "Permission denied") {
        Write-Host "========================================" -ForegroundColor Yellow
        Write-Host "Eventarc Permission Issue Detected" -ForegroundColor Yellow
        Write-Host "========================================" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "This is a common issue with 2nd gen Firebase Functions." -ForegroundColor Yellow
        Write-Host "Run the fix script:" -ForegroundColor Cyan
        Write-Host "  cd .." -ForegroundColor White
        Write-Host "  .\fix-eventarc-permissions.ps1" -ForegroundColor White
        Write-Host ""
        Write-Host "Then wait 2-5 minutes and retry deployment." -ForegroundColor Yellow
        Write-Host ""
    }
    
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment Successful!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Show deployed functions
Write-Host "Deployed webhook functions:" -ForegroundColor Cyan
Write-Host "  - onUserCreated" -ForegroundColor White
Write-Host "  - onDocumentUploadedCreate" -ForegroundColor White
Write-Host "  - onDocumentUploadedUpdate" -ForegroundColor White
Write-Host "  - onOpportunitySaved" -ForegroundColor White
Write-Host "  - onOpportunityApplied" -ForegroundColor White
Write-Host "  - onOpportunitiesRecommended" -ForegroundColor White
Write-Host "  - onOpportunityAnalyzed" -ForegroundColor White
Write-Host "  - persistRecommendations" -ForegroundColor White

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Create integration in Firestore (see WEBHOOK_SETUP.md)" -ForegroundColor White
Write-Host "2. Test webhook triggers by:" -ForegroundColor White
Write-Host "   - Creating a user profile" -ForegroundColor Gray
Write-Host "   - Uploading a document" -ForegroundColor Gray
Write-Host "   - Saving/applying to opportunities" -ForegroundColor Gray
Write-Host "3. Monitor logs: firebase functions:log" -ForegroundColor White
Write-Host "4. Check delivery logs in Firestore: webhookDeliveries collection" -ForegroundColor White

Write-Host ""
Write-Host "To view function logs:" -ForegroundColor Cyan
Write-Host "  firebase functions:log" -ForegroundColor White

# Return to original directory
Set-Location ..
