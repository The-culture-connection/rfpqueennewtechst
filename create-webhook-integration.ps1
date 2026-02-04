# Create Webhook Integration in Firestore
# Using your ngrok URL: https://monomorphic-deanne-unissuable.ngrok-free.dev

$ngrokUrl = "https://monomorphic-deanne-unissuable.ngrok-free.dev"
$webhookUrl = "$ngrokUrl/webhook"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Create Webhook Integration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "ngrok URL: $ngrokUrl" -ForegroundColor Green
Write-Host "Webhook URL: $webhookUrl" -ForegroundColor Green
Write-Host ""

# Option 1: Firebase CLI command
Write-Host "Option 1: Using Firebase CLI" -ForegroundColor Yellow
Write-Host "Run this command:" -ForegroundColor White
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
Write-Host $firebaseCmd -ForegroundColor Cyan
Write-Host ""

# Option 2: JSON for Firebase Console
Write-Host "Option 2: Manual Creation in Firebase Console" -ForegroundColor Yellow
Write-Host "Go to: Firebase Console → Firestore Database" -ForegroundColor White
Write-Host "Create collection: integrations" -ForegroundColor White
Write-Host "Document ID: local-test" -ForegroundColor White
Write-Host "Paste this JSON:" -ForegroundColor White
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

Write-Host $jsonData -ForegroundColor Cyan
Write-Host ""

# Ask if they want to run the Firebase CLI command
$runNow = Read-Host "Do you want to run the Firebase CLI command now? (y/n)"
if ($runNow -eq "y") {
    Write-Host ""
    Write-Host "Running Firebase CLI command..." -ForegroundColor Yellow
    Invoke-Expression $firebaseCmd
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Integration created successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can now test your webhooks!" -ForegroundColor Cyan
        Write-Host "View logs at:" -ForegroundColor White
        Write-Host "  - local-webhook-receiver/webhook-logs.jsonl" -ForegroundColor Gray
        Write-Host "  - http://127.0.0.1:4040 (ngrok web interface)" -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "❌ Failed to create integration. Please create it manually in Firebase Console." -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "Please create the integration manually using the JSON above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Your Webhooks" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To test, trigger events in your app:" -ForegroundColor White
Write-Host ""
Write-Host "1. user.created:" -ForegroundColor Yellow
Write-Host "   Create a document in: profiles/{userId}" -ForegroundColor Gray
Write-Host ""
Write-Host "2. document.uploaded:" -ForegroundColor Yellow
Write-Host "   Set processingStatus='completed' in: profiles/{userId}/documents/{docId}" -ForegroundColor Gray
Write-Host ""
Write-Host "3. opportunity.saved:" -ForegroundColor Yellow
Write-Host "   Add opportunity to: profiles/{userId}/tracker/saved" -ForegroundColor Gray
Write-Host ""
Write-Host "4. opportunity.applied:" -ForegroundColor Yellow
Write-Host "   Add opportunity to: profiles/{userId}/tracker/applied" -ForegroundColor Gray
Write-Host ""
Write-Host "5. opportunities.recommended:" -ForegroundColor Yellow
Write-Host "   Create document in: userMatches/{userId}/current/latest" -ForegroundColor Gray
Write-Host ""
Write-Host "6. opportunity.analyzed:" -ForegroundColor Yellow
Write-Host "   Update scores in: userMatches/{userId}/current/latest" -ForegroundColor Gray
Write-Host ""
