# Quick Start Script for Testing Webhooks with ngrok
# This script helps you set up and test your Firebase webhooks

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Webhook Testing Setup with ngrok" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if ngrok is installed
Write-Host "[1/4] Checking ngrok installation..." -ForegroundColor Yellow
try {
    $ngrokVersion = ngrok version 2>&1
    Write-Host "  ✅ ngrok is installed" -ForegroundColor Green
} catch {
    Write-Host "  ❌ ngrok not found in PATH" -ForegroundColor Red
    Write-Host "  Please install ngrok from: https://ngrok.com/download" -ForegroundColor Yellow
    Write-Host "  Or add ngrok to your PATH" -ForegroundColor Yellow
    exit 1
}

# Step 2: Check local webhook receiver
Write-Host ""
Write-Host "[2/4] Checking local webhook receiver..." -ForegroundColor Yellow
if (-not (Test-Path "local-webhook-receiver\server.ts")) {
    Write-Host "  ❌ local-webhook-receiver not found!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "local-webhook-receiver\node_modules")) {
    Write-Host "  ⚠️  Dependencies not installed, installing now..." -ForegroundColor Yellow
    Set-Location local-webhook-receiver
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ❌ npm install failed!" -ForegroundColor Red
        exit 1
    }
    Set-Location ..
    Write-Host "  ✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ✅ Dependencies installed" -ForegroundColor Green
}

# Step 3: Instructions
Write-Host ""
Write-Host "[3/4] Setup Instructions" -ForegroundColor Yellow
Write-Host ""
Write-Host "You need to run TWO commands in SEPARATE terminal windows:" -ForegroundColor White
Write-Host ""
Write-Host "TERMINAL 1 - Start Webhook Receiver:" -ForegroundColor Cyan
Write-Host "  cd local-webhook-receiver" -ForegroundColor White
Write-Host "  npm start" -ForegroundColor White
Write-Host ""
Write-Host "TERMINAL 2 - Start ngrok:" -ForegroundColor Cyan
Write-Host "  ngrok http 3000" -ForegroundColor White
Write-Host ""
Write-Host "After starting ngrok, copy the HTTPS URL (e.g., https://abc123.ngrok.io)" -ForegroundColor Yellow
Write-Host ""

# Step 4: Integration creation helper
Write-Host "[4/4] Create Integration in Firestore" -ForegroundColor Yellow
Write-Host ""
$ngrokUrl = Read-Host "Enter your ngrok URL (e.g., https://abc123.ngrok.io)"

if ($ngrokUrl -notmatch "^https://.*\.ngrok\.io$") {
    Write-Host "  ⚠️  URL format looks incorrect. Make sure it's: https://xxxxx.ngrok.io" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 0
    }
}

$webhookUrl = "$ngrokUrl/webhook"
Write-Host ""
Write-Host "Integration Details:" -ForegroundColor Cyan
Write-Host "  Collection: integrations" -ForegroundColor White
Write-Host "  Document ID: local-test (or any ID)" -ForegroundColor White
Write-Host "  webhookUrl: $webhookUrl" -ForegroundColor White
Write-Host "  secret: test-secret-change-me" -ForegroundColor White
Write-Host "  enabledEvents: [user.created, document.uploaded, opportunity.saved, opportunity.applied, opportunities.recommended, opportunity.analyzed]" -ForegroundColor White
Write-Host "  isActive: true" -ForegroundColor White
Write-Host ""

# Generate Firebase CLI command
Write-Host "Firebase CLI Command (copy and run):" -ForegroundColor Cyan
Write-Host ""
$firebaseCmd = @"
firebase firestore:set integrations/local-test `
  name="Local Test Integration" `
  webhookUrl="$webhookUrl" `
  secret="test-secret-change-me" `
  enabledEvents="[user.created,document.uploaded,opportunity.saved,opportunity.applied,opportunities.recommended,opportunity.analyzed]" `
  isActive=true `
  createdAt="$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')"
"@
Write-Host $firebaseCmd -ForegroundColor White
Write-Host ""

# Or provide JSON for Firebase Console
Write-Host "Or create manually in Firebase Console with this JSON:" -ForegroundColor Cyan
Write-Host ""
$jsonData = @{
    name = "Local Test Integration"
    webhookUrl = $webhookUrl
    secret = "test-secret-change-me"
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
Write-Host $jsonData -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Start webhook receiver in Terminal 1" -ForegroundColor White
Write-Host "2. Start ngrok in Terminal 2" -ForegroundColor White
Write-Host "3. Create integration in Firestore (use command/JSON above)" -ForegroundColor White
Write-Host "4. Trigger events in your app and watch the logs!" -ForegroundColor White
Write-Host ""
Write-Host "View logs:" -ForegroundColor Yellow
Write-Host "  - Local receiver: local-webhook-receiver/webhook-logs.jsonl" -ForegroundColor White
Write-Host "  - ngrok web interface: http://127.0.0.1:4040" -ForegroundColor White
Write-Host "  - Firebase Functions: firebase functions:log" -ForegroundColor White
Write-Host ""
