# Quick Deploy Script - Minimal Output
# For when you just want to deploy quickly

Set-Location functions
npm install --silent
npm run build
if ($LASTEXITCODE -eq 0) {
    firebase deploy --only functions
} else {
    Write-Host "Build failed!" -ForegroundColor Red
}
Set-Location ..
