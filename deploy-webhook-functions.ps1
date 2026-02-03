# Quick deploy script for webhook functions only
# This script deploys only the webhook-related functions

Write-Host "Deploying webhook functions..." -ForegroundColor Cyan
Write-Host ""

cd functions

# Build first
Write-Host "Building TypeScript..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Deploy specific webhook functions
Write-Host ""
Write-Host "Deploying webhook functions..." -ForegroundColor Yellow
Write-Host ""

firebase deploy --only `
    functions:onUserCreated,`
    functions:onDocumentUploadedCreate,`
    functions:onDocumentUploadedUpdate,`
    functions:onOpportunitySaved,`
    functions:onOpportunityApplied,`
    functions:onOpportunitiesRecommended,`
    functions:onOpportunityAnalyzed,`
    functions:persistRecommendations

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Webhook functions deployed successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "✗ Deployment failed!" -ForegroundColor Red
    
    # Check for Eventarc errors
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "If you see Eventarc permission errors, run:" -ForegroundColor Yellow
        Write-Host "  cd .." -ForegroundColor Cyan
        Write-Host "  .\fix-eventarc-permissions.ps1" -ForegroundColor Cyan
    }
    
    exit 1
}

cd ..
