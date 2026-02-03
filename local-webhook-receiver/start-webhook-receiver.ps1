# PowerShell script to start the local webhook receiver

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Local Webhook Receiver" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "server.ts")) {
    Write-Host "ERROR: server.ts not found!" -ForegroundColor Red
    Write-Host "Please run this script from the local-webhook-receiver directory." -ForegroundColor Yellow
    exit 1
}

# Check if dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "[1/2] Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: npm install failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "  Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "[1/2] Dependencies already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/2] Starting webhook receiver server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Server will run on: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. In a NEW terminal, expose with ngrok:" -ForegroundColor White
Write-Host "   ngrok http 3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Copy the ngrok URL (e.g., https://abc123.ngrok.io)" -ForegroundColor White
Write-Host ""
Write-Host "3. Create integration in Firestore (see instructions below)" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Start the server
npm start
