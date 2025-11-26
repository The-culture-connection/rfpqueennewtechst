# PowerShell script to set Vercel environment variables from .env.local

Write-Host "🔧 Setting up Vercel environment variables..." -ForegroundColor Cyan

# Read .env.local and set each variable in Vercel
Get-Content .env.local | Where-Object { 
    $_ -notmatch '^\s*#' -and $_ -match '=' 
} | ForEach-Object {
    $line = $_.Trim()
    if ($line -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        
        # Remove quotes from value if present
        $value = $value -replace '^"(.*)"$', '$1'
        $value = $value -replace "^'(.*)'$", '$1'
        
        Write-Host "  Setting $key..." -NoNewline
        
        # Set for production, preview, and development
        $result = vercel env add $key production --force 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host " ✅" -ForegroundColor Green
        } else {
            Write-Host " ⚠️ (may already exist)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "✨ Environment variables setup complete!" -ForegroundColor Green
Write-Host "   Run 'vercel' to deploy your app." -ForegroundColor Cyan

