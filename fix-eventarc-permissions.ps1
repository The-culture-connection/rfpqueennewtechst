# Fix Eventarc Service Agent Permissions
# This script grants the necessary IAM role to the Eventarc Service Agent
# Required for deploying 2nd gen Firebase Functions with Firestore triggers

param(
    [string]$ProjectId = "therfpqueen-f11fd"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Eventarc Permissions Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if gcloud is installed
try {
    $gcloudVersion = gcloud --version 2>&1 | Select-Object -First 1
    Write-Host "✓ gcloud CLI found: $gcloudVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ gcloud CLI not found. Please install Google Cloud SDK:" -ForegroundColor Red
    Write-Host "  https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Get the project number
Write-Host "Fetching project number for $ProjectId..." -ForegroundColor Yellow
try {
    $projectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to get project number"
    }
    Write-Host "✓ Project number: $projectNumber" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to get project number. Check your project ID and permissions." -ForegroundColor Red
    exit 1
}

# Eventarc Service Agent email
$serviceAgentEmail = "service-$projectNumber@gcp-sa-eventarc.iam.gserviceaccount.com"

Write-Host ""
Write-Host "Eventarc Service Agent: $serviceAgentEmail" -ForegroundColor Cyan
Write-Host ""

# Grant Eventarc Service Agent role
Write-Host "Granting 'roles/eventarc.serviceAgent' role..." -ForegroundColor Yellow
try {
    gcloud projects add-iam-policy-binding $ProjectId `
        --member="serviceAccount:$serviceAgentEmail" `
        --role="roles/eventarc.serviceAgent" `
        --condition=None 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Successfully granted Eventarc Service Agent role" -ForegroundColor Green
    } else {
        Write-Host "⚠ Role may already be granted or you may need additional permissions" -ForegroundColor Yellow
        Write-Host "  Check IAM permissions in Google Cloud Console" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Failed to grant role. Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual steps:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://console.cloud.google.com/iam-admin/iam?project=$ProjectId" -ForegroundColor Cyan
    Write-Host "2. Find or add: $serviceAgentEmail" -ForegroundColor Cyan
    Write-Host "3. Grant role: Eventarc Service Agent" -ForegroundColor Cyan
    exit 1
}

# Also grant Pub/Sub Service Agent role (often needed together)
Write-Host ""
Write-Host "Granting 'roles/pubsub.serviceAgent' role..." -ForegroundColor Yellow
$pubsubServiceAgentEmail = "service-$projectNumber@gcp-sa-pubsub.iam.gserviceaccount.com"
try {
    gcloud projects add-iam-policy-binding $ProjectId `
        --member="serviceAccount:$pubsubServiceAgentEmail" `
        --role="roles/pubsub.serviceAgent" `
        --condition=None 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Successfully granted Pub/Sub Service Agent role" -ForegroundColor Green
    } else {
        Write-Host "⚠ Pub/Sub role may already be granted" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Could not grant Pub/Sub role (may not be needed)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Wait 2-5 minutes for permissions to propagate" -ForegroundColor Yellow
Write-Host "2. Retry deployment:" -ForegroundColor Yellow
Write-Host "   cd functions" -ForegroundColor Cyan
Write-Host "   firebase deploy --only functions" -ForegroundColor Cyan
Write-Host ""
Write-Host "If deployment still fails:" -ForegroundColor Yellow
Write-Host "- Wait another 5 minutes and retry" -ForegroundColor Yellow
Write-Host "- Check IAM in Google Cloud Console" -ForegroundColor Yellow
Write-Host "- Verify you have 'Owner' or 'Editor' role on the project" -ForegroundColor Yellow
Write-Host ""
