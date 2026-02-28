# Test Grants.gov API Endpoint
# PowerShell script to test the Grants.gov search2 API

$uri = "https://api.grants.gov/v1/api/search2"
$body = @{
    rows = 10
    keyword = ""
    oppNum = ""
    eligibilities = ""
    agencies = ""
    oppStatuses = "forecasted|posted"
    aln = ""
    fundingCategories = ""
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "Testing Grants.gov API endpoint: $uri" -ForegroundColor Cyan
Write-Host "Request Body: $body" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri $uri -Method POST -Headers $headers -Body $body -UseBasicParsing
    
    Write-Host "`n✅ SUCCESS!" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "`nResponse:" -ForegroundColor Yellow
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "`n❌ ERROR!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "`nResponse Body:" -ForegroundColor Yellow
        Write-Host $responseBody
    }
}
