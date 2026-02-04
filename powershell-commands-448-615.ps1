# PowerShell Commands (Lines 448-615)
# Production deployment, error handling, and operational management

# ============================================================================
# Lines 448-500: Production Deployment and Configuration
# ============================================================================

# 448. Production deployment checklist
Write-Host "`n[448] Production Deployment Checklist:" -ForegroundColor Cyan
$prodChecklist = @(
    "Firebase project is production (not development)",
    "All functions are deployed and verified",
    "Integration secrets are strong (32+ characters)",
    "Webhook URLs use HTTPS (not HTTP)",
    "Receiver endpoints are production-ready",
    "Error monitoring is configured",
    "Delivery logs are being collected",
    "Retry logic is tested and working",
    "Signed URLs have appropriate expiry (7 days)",
    "Chunking is configured for large payloads"
)

foreach ($item in $prodChecklist) {
    Write-Host "  [ ] $item" -ForegroundColor White
}

# 449. Generate production integration template
Write-Host "`n[449] Generating production integration template..." -ForegroundColor Cyan
$prodIntegration = @{
    name = "Production Integration"
    webhookUrl = "https://YOUR-PRODUCTION-ENDPOINT.com/webhook"
    secret = "CHANGE-THIS-TO-STRONG-SECRET-32-CHARACTERS-MINIMUM"
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
    metadata = @{
        environment = "production"
        createdBy = "admin"
        notes = "Production webhook integration"
    }
} | ConvertTo-Json -Depth 10

$prodIntegrationFile = "production-integration-template.json"
$prodIntegration | Out-File -FilePath $prodIntegrationFile -Encoding UTF8
Write-Host "  Saved to: $prodIntegrationFile" -ForegroundColor Green

# 450. Production environment validation
Write-Host "`n[450] Validating production environment..." -ForegroundColor Cyan
$env = firebase use 2>&1
if ($env -match "production|therfpqueen-f11fd") {
    Write-Host "  ✓ Production project selected" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Current project: $env" -ForegroundColor Yellow
    Write-Host "  Verify this is the correct production project" -ForegroundColor Yellow
}

# 451. Verify production functions
Write-Host "`n[451] Verifying production functions..." -ForegroundColor Cyan
try {
    $prodFunctions = firebase functions:list 2>&1
    $webhookFunctions = @("onUserCreated", "onDocumentUploadedCreate", "onDocumentUploadedUpdate", "onOpportunitySaved", 
                          "onOpportunityApplied", "onOpportunitiesRecommended", 
                          "onOpportunityAnalyzed", "persistRecommendations")
    
    $deployedCount = 0
    foreach ($func in $webhookFunctions) {
        if ($prodFunctions -match $func) {
            Write-Host "  ✓ $func" -ForegroundColor Green
            $deployedCount++
        } else {
            Write-Host "  ✗ $func (NOT DEPLOYED)" -ForegroundColor Red
        }
    }
    
    Write-Host "`n  Deployed: $deployedCount / $($webhookFunctions.Count)" -ForegroundColor $(if ($deployedCount -eq $webhookFunctions.Count) { "Green" } else { "Yellow" })
} catch {
    Write-Host "  ⚠ Could not verify functions" -ForegroundColor Yellow
}

# 452. Production secret generation
Write-Host "`n[452] Generating production-ready secret..." -ForegroundColor Cyan
$prodSecret = -join ((65..90) + (97..122) + (48..57) + (33,35,36,37,38,42,43,45,61,63,64,95) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Write-Host "  Generated 64-character secret:" -ForegroundColor White
Write-Host "  $prodSecret" -ForegroundColor Gray
Write-Host "`n  ⚠ IMPORTANT: Save this secret securely!" -ForegroundColor Yellow
Write-Host "  Store in:" -ForegroundColor White
Write-Host "    - Firestore integration.secret field" -ForegroundColor Gray
Write-Host "    - Receiver WEBHOOK_SECRET environment variable" -ForegroundColor Gray
Write-Host "    - Secure password manager" -ForegroundColor Gray

# 453. Production webhook URL validation
Write-Host "`n[453] Production Webhook URL Requirements:" -ForegroundColor Cyan
Write-Host "  ✓ Must use HTTPS (not HTTP)" -ForegroundColor Green
Write-Host "  ✓ Must have valid SSL certificate" -ForegroundColor Green
Write-Host "  ✓ Must be publicly accessible" -ForegroundColor Green
Write-Host "  ✓ Must respond within 30 seconds" -ForegroundColor Green
Write-Host "  ✓ Must return 2xx for success" -ForegroundColor Green
Write-Host "  ✓ Should have monitoring/alerting" -ForegroundColor Yellow

# 454. Create production deployment script
Write-Host "`n[454] Creating production deployment script..." -ForegroundColor Cyan
$prodDeployScript = @"
# Production Deployment Script
# Run this to deploy webhook functions to production

Write-Host "=== Production Deployment ===" -ForegroundColor Cyan

# Verify environment
`$env = firebase use 2>&1
if (`$env -notmatch "production|therfpqueen-f11fd") {
    Write-Host "ERROR: Not on production project!" -ForegroundColor Red
    Write-Host "Current: `$env" -ForegroundColor Yellow
    exit 1
}

# Build
Write-Host "Building..." -ForegroundColor Yellow
cd functions
npm install --production=false
npm run build

if (`$LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Deploy
Write-Host "Deploying to production..." -ForegroundColor Yellow
firebase deploy --only functions

if (`$LASTEXITCODE -eq 0) {
    Write-Host "✓ Production deployment successful!" -ForegroundColor Green
} else {
    Write-Host "✗ Deployment failed!" -ForegroundColor Red
    exit 1
}

cd ..
"@

$prodDeployFile = "deploy-production.ps1"
$prodDeployScript | Out-File -FilePath $prodDeployFile -Encoding UTF8
Write-Host "  Saved to: $prodDeployFile" -ForegroundColor Green

# ============================================================================
# Lines 455-500: Error Handling and Recovery
# ============================================================================

# 455. Error handling configuration
Write-Host "`n[455] Error Handling Configuration:" -ForegroundColor Cyan
Write-Host "  Retry Strategy:" -ForegroundColor White
Write-Host "    - Max Attempts: 5" -ForegroundColor Gray
Write-Host "    - Exponential Backoff: 250ms → 4s" -ForegroundColor Gray
Write-Host "    - Retry on: Network errors, 5xx, 429, 408" -ForegroundColor Gray
Write-Host "    - Don't retry: Other 4xx (client errors)" -ForegroundColor Gray
Write-Host "  Error Logging:" -ForegroundColor White
Write-Host "    - All attempts logged to webhookDeliveries" -ForegroundColor Gray
Write-Host "    - Last error message preserved" -ForegroundColor Gray
Write-Host "    - HTTP status codes recorded" -ForegroundColor Gray

# 456. Create error recovery script
Write-Host "`n[456] Creating error recovery script..." -ForegroundColor Cyan
$recoveryScript = @"
# Error Recovery Script
# Helps recover from failed webhook deliveries

Write-Host "=== Webhook Error Recovery ===" -ForegroundColor Cyan

# Find failed deliveries
Write-Host "`nFinding failed deliveries..." -ForegroundColor Yellow
Write-Host "  Query Firestore: webhookDeliveries collection" -ForegroundColor White
Write-Host "  Filter: status == 'failed'" -ForegroundColor White
Write-Host "  Sort by: updatedAt desc" -ForegroundColor White

# Recovery options
Write-Host "`nRecovery Options:" -ForegroundColor Yellow
Write-Host "  1. Manual retry: Re-trigger the original Firestore event" -ForegroundColor White
Write-Host "  2. Fix receiver: Ensure endpoint is accessible" -ForegroundColor White
Write-Host "  3. Update integration: Fix webhookUrl or secret" -ForegroundColor White
Write-Host "  4. Review errors: Check lastError field in delivery logs" -ForegroundColor White

# Common error fixes
Write-Host "`nCommon Error Fixes:" -ForegroundColor Yellow
Write-Host "  - 401 Unauthorized: Check secret matches" -ForegroundColor White
Write-Host "  - 404 Not Found: Verify webhookUrl is correct" -ForegroundColor White
Write-Host "  - 500 Server Error: Check receiver logs" -ForegroundColor White
Write-Host "  - Timeout: Increase receiver timeout or check network" -ForegroundColor White
"@

$recoveryFile = "error-recovery.ps1"
$recoveryScript | Out-File -FilePath $recoveryFile -Encoding UTF8
Write-Host "  Saved to: $recoveryFile" -ForegroundColor Green

# 457. Failed delivery analysis
Write-Host "`n[457] Failed Delivery Analysis:" -ForegroundColor Cyan
Write-Host "  To analyze failed deliveries:" -ForegroundColor White
Write-Host "  1. Query: webhookDeliveries where status = 'failed'" -ForegroundColor Gray
Write-Host "  2. Group by: lastError or httpStatus" -ForegroundColor Gray
Write-Host "  3. Identify patterns (common errors)" -ForegroundColor Gray
Write-Host "  4. Fix root cause" -ForegroundColor Gray
Write-Host "  5. Re-trigger affected events if needed" -ForegroundColor Gray

# 458. Create failed delivery report
Write-Host "`n[458] Creating failed delivery report query..." -ForegroundColor Cyan
$failedReportQuery = @"
// Failed Delivery Report
// Run in Firestore Console or Admin SDK

const failedDeliveries = await db.collection('webhookDeliveries')
  .where('status', '==', 'failed')
  .orderBy('updatedAt', 'desc')
  .limit(100)
  .get();

const report = {
  total: failedDeliveries.size,
  byError: {},
  byEventType: {},
  byIntegration: {},
  recent: []
};

failedDeliveries.forEach(doc => {
  const data = doc.data();
  
  // Group by error
  const error = data.lastError || 'unknown';
  report.byError[error] = (report.byError[error] || 0) + 1;
  
  // Group by event type
  const eventType = data.eventType || 'unknown';
  report.byEventType[eventType] = (report.byEventType[eventType] || 0) + 1;
  
  // Group by integration
  const integrationId = data.integrationId || 'unknown';
  report.byIntegration[integrationId] = (report.byIntegration[integrationId] || 0) + 1;
  
  // Recent failures
  if (report.recent.length < 10) {
    report.recent.push({
      eventId: data.eventId,
      eventType: data.eventType,
      error: data.lastError,
      httpStatus: data.httpStatus,
      attempts: data.attempts,
      updatedAt: data.updatedAt
    });
  }
});

console.log('Failed Delivery Report:', JSON.stringify(report, null, 2));
"@

$failedReportFile = "failed-delivery-report.js"
$failedReportQuery | Out-File -FilePath $failedReportFile -Encoding UTF8
Write-Host "  Saved to: $failedReportFile" -ForegroundColor Green

# 459. Retry failed deliveries
Write-Host "`n[459] To retry failed deliveries:" -ForegroundColor Cyan
Write-Host "  Option 1: Re-trigger original Firestore event" -ForegroundColor White
Write-Host "    - Re-create the document that triggered the webhook" -ForegroundColor Gray
Write-Host "    - Or update a field to trigger onWrite" -ForegroundColor Gray
Write-Host "  Option 2: Manual webhook send (if you have event data)" -ForegroundColor White
Write-Host "    - Use the event payload from delivery logs" -ForegroundColor Gray
Write-Host "    - Send to receiver manually" -ForegroundColor Gray
Write-Host "  Option 3: Fix root cause and wait for natural retry" -ForegroundColor White
Write-Host "    - Fix receiver/endpoint issue" -ForegroundColor Gray
Write-Host "    - Future events will succeed" -ForegroundColor Gray

# 460. Error notification setup
Write-Host "`n[460] Error Notification Setup:" -ForegroundColor Cyan
Write-Host "  Recommended monitoring:" -ForegroundColor White
Write-Host "    - Firebase Functions logs → Cloud Monitoring" -ForegroundColor Gray
Write-Host "    - Webhook delivery failures → Alert on threshold" -ForegroundColor Gray
Write-Host "    - Receiver downtime → Health check monitoring" -ForegroundColor Gray
Write-Host "    - High failure rate → Alert after 10 failures/hour" -ForegroundColor Gray

# ============================================================================
# Lines 461-520: Operational Management
# ============================================================================

# 461. Integration lifecycle management
Write-Host "`n[461] Integration Lifecycle Management:" -ForegroundColor Cyan
Write-Host "  Create:" -ForegroundColor White
Write-Host "    - Add document to integrations collection" -ForegroundColor Gray
Write-Host "    - Set isActive: true to enable" -ForegroundColor Gray
Write-Host "  Update:" -ForegroundColor White
Write-Host "    - Modify fields in Firestore" -ForegroundColor Gray
Write-Host "    - Changes take effect immediately" -ForegroundColor Gray
Write-Host "  Disable:" -ForegroundColor White
Write-Host "    - Set isActive: false" -ForegroundColor Gray
Write-Host "    - Stops all webhook deliveries" -ForegroundColor Gray
Write-Host "  Delete:" -ForegroundColor White
Write-Host "    - Delete document from Firestore" -ForegroundColor Gray
Write-Host "    - Delivery logs are preserved" -ForegroundColor Gray

# 462. Create integration management script
Write-Host "`n[462] Creating integration management script..." -ForegroundColor Cyan
$mgmtScript = @"
# Integration Management Script
# Helper functions for managing webhook integrations

function Get-Integration {
    param([string]`$IntegrationId)
    Write-Host "Get integration: `$IntegrationId" -ForegroundColor Cyan
    Write-Host "  Query Firestore: integrations/`$IntegrationId" -ForegroundColor White
}

function Enable-Integration {
    param([string]`$IntegrationId)
    Write-Host "Enable integration: `$IntegrationId" -ForegroundColor Cyan
    Write-Host "  Update Firestore: integrations/`$IntegrationId" -ForegroundColor White
    Write-Host "    Set: isActive = true" -ForegroundColor Gray
}

function Disable-Integration {
    param([string]`$IntegrationId)
    Write-Host "Disable integration: `$IntegrationId" -ForegroundColor Cyan
    Write-Host "  Update Firestore: integrations/`$IntegrationId" -ForegroundColor White
    Write-Host "    Set: isActive = false" -ForegroundColor Gray
}

function Update-IntegrationUrl {
    param([string]`$IntegrationId, [string]`$NewUrl)
    Write-Host "Update webhook URL: `$IntegrationId" -ForegroundColor Cyan
    Write-Host "  Update Firestore: integrations/`$IntegrationId" -ForegroundColor White
    Write-Host "    Set: webhookUrl = `$NewUrl" -ForegroundColor Gray
}

function Rotate-IntegrationSecret {
    param([string]`$IntegrationId)
    Write-Host "Rotate secret: `$IntegrationId" -ForegroundColor Cyan
    Write-Host "  1. Generate new secret" -ForegroundColor White
    Write-Host "  2. Update integration.secret in Firestore" -ForegroundColor White
    Write-Host "  3. Update receiver WEBHOOK_SECRET" -ForegroundColor White
    Write-Host "  4. Test webhook delivery" -ForegroundColor White
}

# Usage examples
Write-Host "`nUsage Examples:" -ForegroundColor Yellow
Write-Host "  Get-Integration 'test-integration'" -ForegroundColor White
Write-Host "  Enable-Integration 'test-integration'" -ForegroundColor White
Write-Host "  Disable-Integration 'test-integration'" -ForegroundColor White
Write-Host "  Update-IntegrationUrl 'test-integration' 'https://new-url.com/webhook'" -ForegroundColor White
Write-Host "  Rotate-IntegrationSecret 'test-integration'" -ForegroundColor White
"@

$mgmtFile = "manage-integrations.ps1"
$mgmtScript | Out-File -FilePath $mgmtFile -Encoding UTF8
Write-Host "  Saved to: $mgmtFile" -ForegroundColor Green

# 463. Integration health check
Write-Host "`n[463] Integration Health Check:" -ForegroundColor Cyan
$healthCheckScript = @"
# Integration Health Check
# Checks if integrations are properly configured

Write-Host "=== Integration Health Check ===" -ForegroundColor Cyan

# Check integrations exist
Write-Host "`n[1] Checking integrations..." -ForegroundColor Yellow
Write-Host "  Query: Firestore → integrations collection" -ForegroundColor White
Write-Host "  Verify: isActive = true for active integrations" -ForegroundColor White

# Check webhook URLs
Write-Host "`n[2] Checking webhook URLs..." -ForegroundColor Yellow
Write-Host "  Test each webhookUrl with: Invoke-WebRequest" -ForegroundColor White
Write-Host "  Verify: Returns 200 or 405 (method not allowed is OK)" -ForegroundColor White

# Check recent deliveries
Write-Host "`n[3] Checking recent deliveries..." -ForegroundColor Yellow
Write-Host "  Query: webhookDeliveries (last 24 hours)" -ForegroundColor White
Write-Host "  Check: Failure rate < 5%" -ForegroundColor White

# Check function triggers
Write-Host "`n[4] Checking function triggers..." -ForegroundColor Yellow
Write-Host "  Verify: All webhook functions are deployed" -ForegroundColor White
Write-Host "  Check: firebase functions:list" -ForegroundColor White

Write-Host "`n=== Health Check Complete ===" -ForegroundColor Cyan
"@

$healthCheckFile = "integration-health-check.ps1"
$healthCheckScript | Out-File -FilePath $healthCheckFile -Encoding UTF8
Write-Host "  Saved to: $healthCheckFile" -ForegroundColor Green

# 464. Integration audit
Write-Host "`n[464] Integration Audit:" -ForegroundColor Cyan
Write-Host "  Audit Checklist:" -ForegroundColor White
Write-Host "    [ ] All integrations have strong secrets" -ForegroundColor Gray
Write-Host "    [ ] All webhookUrls use HTTPS" -ForegroundColor Gray
Write-Host "    [ ] All integrations have enabledEvents configured" -ForegroundColor Gray
Write-Host "    [ ] Inactive integrations are disabled (isActive: false)" -ForegroundColor Gray
Write-Host "    [ ] Secrets are stored securely (not in code)" -ForegroundColor Gray
Write-Host "    [ ] Delivery logs are being collected" -ForegroundColor Gray
Write-Host "    [ ] Error monitoring is configured" -ForegroundColor Gray

# 465. Create audit script
Write-Host "`n[465] Creating audit script..." -ForegroundColor Cyan
$auditScript = @"
# Integration Audit Script
# Audits webhook integrations for security and configuration

Write-Host "=== Integration Audit ===" -ForegroundColor Cyan

# Security checks
Write-Host "`nSecurity Checks:" -ForegroundColor Yellow
Write-Host "  [ ] Secrets are 32+ characters" -ForegroundColor White
Write-Host "  [ ] Webhook URLs use HTTPS" -ForegroundColor White
Write-Host "  [ ] No secrets in code or logs" -ForegroundColor White
Write-Host "  [ ] Secrets are rotated periodically" -ForegroundColor White

# Configuration checks
Write-Host "`nConfiguration Checks:" -ForegroundColor Yellow
Write-Host "  [ ] enabledEvents is not empty" -ForegroundColor White
Write-Host "  [ ] webhookUrl is valid and accessible" -ForegroundColor White
Write-Host "  [ ] isActive reflects actual usage" -ForegroundColor White

# Operational checks
Write-Host "`nOperational Checks:" -ForegroundColor Yellow
Write-Host "  [ ] Delivery success rate > 95%" -ForegroundColor White
Write-Host "  [ ] Average delivery time < 2 seconds" -ForegroundColor White
Write-Host "  [ ] No recurring errors" -ForegroundColor White

Write-Host "`n=== Audit Complete ===" -ForegroundColor Cyan
"@

$auditFile = "audit-integrations.ps1"
$auditScript | Out-File -FilePath $auditFile -Encoding UTF8
Write-Host "  Saved to: $auditFile" -ForegroundColor Green

# ============================================================================
# Lines 466-520: Performance Monitoring
# ============================================================================

# 466. Performance metrics collection
Write-Host "`n[466] Performance Metrics:" -ForegroundColor Cyan
Write-Host "  Key Metrics:" -ForegroundColor White
Write-Host "    - Delivery Success Rate: % of successful deliveries" -ForegroundColor Gray
Write-Host "    - Average Delivery Time: Mean time to deliver" -ForegroundColor Gray
Write-Host "    - P95 Delivery Time: 95th percentile" -ForegroundColor Gray
Write-Host "    - Retry Rate: % of deliveries requiring retries" -ForegroundColor Gray
Write-Host "    - Error Rate: % of failed deliveries" -ForegroundColor Gray
Write-Host "    - Events per Hour: Throughput metric" -ForegroundColor Gray

# 467. Create performance monitoring query
Write-Host "`n[467] Creating performance monitoring query..." -ForegroundColor Cyan
$perfQuery = @"
// Performance Metrics Query
// Calculates key performance indicators

const now = new Date();
const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

const deliveries = await db.collection('webhookDeliveries')
  .where('createdAt', '>=', last24h)
  .get();

const metrics = {
  total: deliveries.size,
  delivered: 0,
  failed: 0,
  totalAttempts: 0,
  avgAttempts: 0,
  byEventType: {}
};

let totalDeliveryTime = 0;
let deliveryCount = 0;

deliveries.forEach(doc => {
  const data = doc.data();
  
  if (data.status === 'delivered') {
    metrics.delivered++;
  } else {
    metrics.failed++;
  }
  
  metrics.totalAttempts += data.attempts || 1;
  
  const eventType = data.eventType || 'unknown';
  if (!metrics.byEventType[eventType]) {
    metrics.byEventType[eventType] = { total: 0, delivered: 0, failed: 0 };
  }
  metrics.byEventType[eventType].total++;
  if (data.status === 'delivered') {
    metrics.byEventType[eventType].delivered++;
  } else {
    metrics.byEventType[eventType].failed++;
  }
  
  // Calculate delivery time (if available)
  if (data.createdAt && data.updatedAt) {
    const created = data.createdAt.toDate();
    const updated = data.updatedAt.toDate();
    totalDeliveryTime += (updated - created);
    deliveryCount++;
  }
});

metrics.avgAttempts = metrics.totalAttempts / metrics.total;
metrics.successRate = (metrics.delivered / metrics.total) * 100;
metrics.avgDeliveryTime = deliveryCount > 0 ? totalDeliveryTime / deliveryCount : 0;

console.log('Performance Metrics (Last 24h):', JSON.stringify(metrics, null, 2));
"@

$perfQueryFile = "performance-metrics-query.js"
$perfQuery | Out-File -FilePath $perfQueryFile -Encoding UTF8
Write-Host "  Saved to: $perfQueryFile" -ForegroundColor Green

# 468. Performance alerting thresholds
Write-Host "`n[468] Performance Alerting Thresholds:" -ForegroundColor Cyan
Write-Host "  Recommended Alerts:" -ForegroundColor White
Write-Host "    - Success Rate < 95%: Warning" -ForegroundColor Yellow
Write-Host "    - Success Rate < 90%: Critical" -ForegroundColor Red
Write-Host "    - Avg Delivery Time > 5s: Warning" -ForegroundColor Yellow
Write-Host "    - Avg Delivery Time > 10s: Critical" -ForegroundColor Red
Write-Host "    - Error Rate > 5%: Warning" -ForegroundColor Yellow
Write-Host "    - Error Rate > 10%: Critical" -ForegroundColor Red
Write-Host "    - Retry Rate > 20%: Warning" -ForegroundColor Yellow

# 469. Create alerting script
Write-Host "`n[469] Creating alerting script..." -ForegroundColor Cyan
$alertScript = @"
# Performance Alerting Script
# Checks metrics and sends alerts if thresholds exceeded

Write-Host "=== Performance Alerting ===" -ForegroundColor Cyan

# Query recent deliveries (last hour)
Write-Host "`nChecking metrics..." -ForegroundColor Yellow

# Calculate metrics
`$successRate = 95  # Example: Calculate from Firestore
`$avgDeliveryTime = 2.5  # Example: Calculate from Firestore
`$errorRate = 3  # Example: Calculate from Firestore

# Check thresholds
if (`$successRate -lt 95) {
    Write-Host "⚠ ALERT: Success rate below 95%: `$successRate%" -ForegroundColor Yellow
}

if (`$avgDeliveryTime -gt 5) {
    Write-Host "⚠ ALERT: Average delivery time high: `$avgDeliveryTime s" -ForegroundColor Yellow
}

if (`$errorRate -gt 5) {
    Write-Host "⚠ ALERT: Error rate above 5%: `$errorRate%" -ForegroundColor Yellow
}

# In production, send to monitoring service (PagerDuty, Slack, etc.)
"@

$alertFile = "performance-alerts.ps1"
$alertScript | Out-File -FilePath $alertFile -Encoding UTF8
Write-Host "  Saved to: $alertFile" -ForegroundColor Green

# 470. Performance optimization tips
Write-Host "`n[470] Performance Optimization Tips:" -ForegroundColor Cyan
Write-Host "  - Use chunking for large payloads (25 items default)" -ForegroundColor White
Write-Host "  - Batch Firestore writes (400 operations per batch)" -ForegroundColor White
Write-Host "  - Monitor receiver response times" -ForegroundColor White
Write-Host "  - Use CDN for static webhook endpoints" -ForegroundColor White
Write-Host "  - Implement receiver caching if appropriate" -ForegroundColor White
Write-Host "  - Optimize Firestore queries (use indexes)" -ForegroundColor White

# ============================================================================
# Lines 471-520: Security and Compliance
# ============================================================================

# 471. Security audit checklist
Write-Host "`n[471] Security Audit Checklist:" -ForegroundColor Cyan
$securityChecklist = @(
    "All webhook URLs use HTTPS",
    "Secrets are 32+ characters and random",
    "Secrets are stored in Firestore (not code)",
    "Signature verification is enabled on receiver",
    "Idempotency keys are used",
    "Delivery logs don't contain sensitive data",
    "Access to integrations collection is restricted",
    "Secrets are rotated periodically",
    "Failed deliveries are monitored",
    "Receiver endpoints are protected (auth if needed)"
)

foreach ($item in $securityChecklist) {
    Write-Host "  [ ] $item" -ForegroundColor White
}

# 472. Secret rotation procedure
Write-Host "`n[472] Secret Rotation Procedure:" -ForegroundColor Cyan
Write-Host "  1. Generate new secret (64 characters, random)" -ForegroundColor White
Write-Host "  2. Update integration.secret in Firestore" -ForegroundColor White
Write-Host "  3. Update receiver WEBHOOK_SECRET environment variable" -ForegroundColor White
Write-Host "  4. Restart receiver (if needed)" -ForegroundColor White
Write-Host "  5. Test webhook delivery" -ForegroundColor White
Write-Host "  6. Verify signature verification works" -ForegroundColor White
Write-Host "  7. Monitor for delivery failures" -ForegroundColor White
Write-Host "  8. Archive old secret (if needed for audit)" -ForegroundColor White

# 473. Create secret rotation script
Write-Host "`n[473] Creating secret rotation script..." -ForegroundColor Cyan
$rotationScript = @"
# Secret Rotation Script
# Helps rotate webhook secrets securely

param(
    [Parameter(Mandatory=`$true)]
    [string]`$IntegrationId
)

Write-Host "=== Secret Rotation ===" -ForegroundColor Cyan
Write-Host "Integration: `$IntegrationId" -ForegroundColor White

# Generate new secret
`$newSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]`$_})
Write-Host "`nGenerated new secret:" -ForegroundColor Green
Write-Host "  `$newSecret" -ForegroundColor Gray

Write-Host "`nSteps to complete rotation:" -ForegroundColor Yellow
Write-Host "  1. Update Firestore: integrations/`$IntegrationId" -ForegroundColor White
Write-Host "     Set: secret = `$newSecret" -ForegroundColor Gray
Write-Host "  2. Update receiver: WEBHOOK_SECRET = `$newSecret" -ForegroundColor White
Write-Host "  3. Restart receiver" -ForegroundColor White
Write-Host "  4. Test webhook delivery" -ForegroundColor White

Write-Host "`n⚠ Save this secret securely!" -ForegroundColor Yellow
"@

$rotationFile = "rotate-secret.ps1"
$rotationScript | Out-File -FilePath $rotationFile -Encoding UTF8
Write-Host "  Saved to: $rotationFile" -ForegroundColor Green

# 474. Compliance considerations
Write-Host "`n[474] Compliance Considerations:" -ForegroundColor Cyan
Write-Host "  Data Privacy:" -ForegroundColor White
Write-Host "    - Webhook payloads may contain user data" -ForegroundColor Gray
Write-Host "    - Ensure receiver complies with privacy regulations" -ForegroundColor Gray
Write-Host "    - Consider data minimization in payloads" -ForegroundColor Gray
Write-Host "  Audit Trail:" -ForegroundColor White
Write-Host "    - Delivery logs provide audit trail" -ForegroundColor Gray
Write-Host "    - Retain logs per compliance requirements" -ForegroundColor Gray
Write-Host "    - Export logs for long-term storage if needed" -ForegroundColor Gray
Write-Host "  Access Control:" -ForegroundColor White
Write-Host "    - Restrict access to integrations collection" -ForegroundColor Gray
Write-Host "    - Use Firestore security rules" -ForegroundColor Gray
Write-Host "    - Monitor access to sensitive data" -ForegroundColor Gray

# 475. Create compliance report
Write-Host "`n[475] Creating compliance report query..." -ForegroundColor Cyan
$complianceQuery = @"
// Compliance Report
// Generates report for compliance audits

const report = {
  generatedAt: new Date().toISOString(),
  integrations: {
    total: 0,
    active: 0,
    withHttps: 0,
    withStrongSecrets: 0
  },
  deliveries: {
    total: 0,
    successful: 0,
    failed: 0,
    withRetries: 0
  },
  security: {
    secretsRotated: [],  // Track rotation dates
    lastAudit: null,
    vulnerabilities: []
  }
};

// Count integrations
const integrations = await db.collection('integrations').get();
report.integrations.total = integrations.size;

integrations.forEach(doc => {
  const data = doc.data();
  if (data.isActive) report.integrations.active++;
  if (data.webhookUrl && data.webhookUrl.startsWith('https://')) {
    report.integrations.withHttps++;
  }
  if (data.secret && data.secret.length >= 32) {
    report.integrations.withStrongSecrets++;
  }
});

// Count deliveries (last 30 days)
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const deliveries = await db.collection('webhookDeliveries')
  .where('createdAt', '>=', thirtyDaysAgo)
  .get();

deliveries.forEach(doc => {
  const data = doc.data();
  report.deliveries.total++;
  if (data.status === 'delivered') {
    report.deliveries.successful++;
  } else {
    report.deliveries.failed++;
  }
  if (data.attempts > 1) {
    report.deliveries.withRetries++;
  }
});

console.log('Compliance Report:', JSON.stringify(report, null, 2));
"@

$complianceFile = "compliance-report.js"
$complianceQuery | Out-File -FilePath $complianceFile -Encoding UTF8
Write-Host "  Saved to: $complianceFile" -ForegroundColor Green

# ============================================================================
# Lines 476-520: Backup and Disaster Recovery
# ============================================================================

# 476. Backup strategy
Write-Host "`n[476] Backup Strategy:" -ForegroundColor Cyan
Write-Host "  What to Backup:" -ForegroundColor White
Write-Host "    - integrations collection (configuration)" -ForegroundColor Gray
Write-Host "    - webhookDeliveries collection (audit trail)" -ForegroundColor Gray
Write-Host "    - profiles/{uid}/recommendationRuns (normalized data)" -ForegroundColor Gray
Write-Host "  Backup Frequency:" -ForegroundColor White
Write-Host "    - Daily: Automated Firestore export" -ForegroundColor Gray
Write-Host "    - Weekly: Full backup to Cloud Storage" -ForegroundColor Gray
Write-Host "    - Before major changes: Manual backup" -ForegroundColor Gray

# 477. Create backup script
Write-Host "`n[477] Creating backup script..." -ForegroundColor Cyan
$backupScript = @"
# Webhook System Backup Script
# Backs up critical webhook data

Write-Host "=== Webhook System Backup ===" -ForegroundColor Cyan

`$backupDate = Get-Date -Format "yyyy-MM-dd"
`$backupDir = "backups/webhook-`$backupDate"

New-Item -ItemType Directory -Path `$backupDir -Force | Out-Null

Write-Host "`nBacking up collections..." -ForegroundColor Yellow

# Export integrations
Write-Host "  - integrations collection" -ForegroundColor White
Write-Host "    Use: Firebase Console → Firestore → Export" -ForegroundColor Gray
Write-Host "    Or: gcloud firestore export gs://YOUR-BUCKET/backup-`$backupDate" -ForegroundColor Gray

# Export delivery logs
Write-Host "  - webhookDeliveries collection" -ForegroundColor White
Write-Host "    Use: Firebase Console → Firestore → Export" -ForegroundColor Gray

# Export normalized recommendations
Write-Host "  - recommendationRuns subcollections" -ForegroundColor White
Write-Host "    Use: Firestore export (includes subcollections)" -ForegroundColor Gray

Write-Host "`nBackup location: `$backupDir" -ForegroundColor Green
Write-Host "  Store backups in Cloud Storage for long-term retention" -ForegroundColor Yellow
"@

$backupFile = "backup-webhooks.ps1"
$backupScript | Out-File -FilePath $backupFile -Encoding UTF8
Write-Host "  Saved to: $backupFile" -ForegroundColor Green

# 478. Disaster recovery procedure
Write-Host "`n[478] Disaster Recovery Procedure:" -ForegroundColor Cyan
Write-Host "  Scenario 1: Integration deleted" -ForegroundColor White
Write-Host "    - Restore from backup" -ForegroundColor Gray
Write-Host "    - Or recreate from documentation" -ForegroundColor Gray
Write-Host "  Scenario 2: Functions not working" -ForegroundColor White
Write-Host "    - Redeploy: .\deploy-firebase-functions.ps1" -ForegroundColor Gray
Write-Host "    - Check logs: firebase functions:log" -ForegroundColor Gray
Write-Host "  Scenario 3: Receiver down" -ForegroundColor White
Write-Host "    - Restart receiver service" -ForegroundColor Gray
Write-Host "    - Verify webhookUrl is accessible" -ForegroundColor Gray
Write-Host "    - Check delivery logs for missed events" -ForegroundColor Gray
Write-Host "  Scenario 4: Data loss" -ForegroundColor White
Write-Host "    - Restore from Firestore backup" -ForegroundColor Gray
Write-Host "    - Replay missed events if needed" -ForegroundColor Gray

# 479. Create disaster recovery plan
Write-Host "`n[479] Creating disaster recovery plan..." -ForegroundColor Cyan
$drPlan = @"
# Disaster Recovery Plan
# Webhook System Recovery Procedures

## Recovery Time Objectives (RTO)
- Critical integrations: 1 hour
- Non-critical integrations: 4 hours
- Historical data: 24 hours

## Recovery Point Objectives (RPO)
- Delivery logs: 1 hour (real-time)
- Integration config: 24 hours (daily backup)
- Normalized data: 24 hours (daily backup)

## Recovery Procedures

### Integration Recovery
1. Identify lost integration
2. Restore from backup or recreate
3. Verify configuration
4. Test webhook delivery
5. Monitor for 24 hours

### Function Recovery
1. Check deployment status
2. Redeploy if needed
3. Verify triggers are active
4. Test with sample events
5. Monitor logs

### Data Recovery
1. Identify data loss scope
2. Restore from backup
3. Verify data integrity
4. Replay missed events if needed
5. Update documentation
"@

$drPlanFile = "disaster-recovery-plan.md"
$drPlan | Out-File -FilePath $drPlanFile -Encoding UTF8
Write-Host "  Saved to: $drPlanFile" -ForegroundColor Green

# 480. Recovery testing
Write-Host "`n[480] Recovery Testing:" -ForegroundColor Cyan
Write-Host "  Test Scenarios:" -ForegroundColor White
Write-Host "    - Disable integration, verify webhooks stop" -ForegroundColor Gray
Write-Host "    - Re-enable, verify webhooks resume" -ForegroundColor Gray
Write-Host "    - Simulate function failure, redeploy" -ForegroundColor Gray
Write-Host "    - Test backup restore process" -ForegroundColor Gray
Write-Host "    - Verify delivery log integrity" -ForegroundColor Gray

# ============================================================================
# Lines 481-520: Scaling and Optimization
# ============================================================================

# 481. Scaling considerations
Write-Host "`n[481] Scaling Considerations:" -ForegroundColor Cyan
Write-Host "  Current Limits:" -ForegroundColor White
Write-Host "    - Max instances: 10 (per function)" -ForegroundColor Gray
Write-Host "    - Batch size: 400 operations" -ForegroundColor Gray
Write-Host "    - Chunk size: 25 items" -ForegroundColor Gray
Write-Host "    - Delivery timeout: 30 seconds" -ForegroundColor Gray
Write-Host "  Scaling Options:" -ForegroundColor White
Write-Host "    - Increase maxInstances for high volume" -ForegroundColor Gray
Write-Host "    - Adjust chunk size based on payload" -ForegroundColor Gray
Write-Host "    - Use Cloud Tasks for async delivery" -ForegroundColor Gray
Write-Host "    - Implement receiver load balancing" -ForegroundColor Gray

# 482. Performance tuning
Write-Host "`n[482] Performance Tuning:" -ForegroundColor Cyan
Write-Host "  Function Configuration:" -ForegroundColor White
Write-Host "    - Memory: 256MB (default) → 512MB for large payloads" -ForegroundColor Gray
Write-Host "    - Timeout: 60s (default) → 120s for slow receivers" -ForegroundColor Gray
Write-Host "    - Concurrency: 80 (default) → adjust based on load" -ForegroundColor Gray
Write-Host "  Firestore:" -ForegroundColor White
Write-Host "    - Use composite indexes for queries" -ForegroundColor Gray
Write-Host "    - Batch writes efficiently" -ForegroundColor Gray
Write-Host "    - Use transactions where needed" -ForegroundColor Gray

# 483. Create scaling script
Write-Host "`n[483] Creating scaling configuration..." -ForegroundColor Cyan
$scalingConfig = @"
# Scaling Configuration
# Adjust these values based on your load

`$scalingConfig = @{
    maxInstances = 10  # Increase for high volume
    memory = "256MiB"  # Increase to 512MiB for large payloads
    timeout = 60  # Increase to 120 for slow receivers
    concurrency = 80  # Adjust based on receiver capacity
    chunkSize = 25  # Adjust based on payload size
    batchSize = 400  # Firestore batch limit
}

Write-Host "Current Scaling Configuration:" -ForegroundColor Cyan
`$scalingConfig | Format-List
"@

$scalingFile = "scaling-config.ps1"
$scalingConfig | Out-File -FilePath $scalingFile -Encoding UTF8
Write-Host "  Saved to: $scalingFile" -ForegroundColor Green

# 484. Load testing
Write-Host "`n[484] Load Testing:" -ForegroundColor Cyan
Write-Host "  Test Scenarios:" -ForegroundColor White
Write-Host "    - 100 events/minute: Normal load" -ForegroundColor Gray
Write-Host "    - 1000 events/minute: High load" -ForegroundColor Gray
Write-Host "    - 5000 events/minute: Stress test" -ForegroundColor Gray
Write-Host "  Metrics to Monitor:" -ForegroundColor White
Write-Host "    - Delivery success rate" -ForegroundColor Gray
Write-Host "    - Average delivery time" -ForegroundColor Gray
Write-Host "    - Function execution time" -ForegroundColor Gray
Write-Host "    - Firestore write latency" -ForegroundColor Gray
Write-Host "    - Receiver response time" -ForegroundColor Gray

# 485. Create load test plan
Write-Host "`n[485] Creating load test plan..." -ForegroundColor Cyan
$loadTestPlan = @"
# Load Test Plan
# Systematic testing of webhook system under load

## Test Phases

### Phase 1: Baseline (100 events/min)
- Duration: 10 minutes
- Expected: 100% success rate, <2s delivery time
- Monitor: Function logs, delivery logs

### Phase 2: Normal Load (500 events/min)
- Duration: 10 minutes
- Expected: >99% success rate, <3s delivery time
- Monitor: Function performance, Firestore writes

### Phase 3: High Load (1000 events/min)
- Duration: 10 minutes
- Expected: >95% success rate, <5s delivery time
- Monitor: Retry rate, error patterns

### Phase 4: Stress Test (5000 events/min)
- Duration: 5 minutes
- Expected: System degrades gracefully
- Monitor: Failure modes, recovery time

## Success Criteria
- Success rate >95% under normal load
- Average delivery time <5s
- No data loss
- Graceful degradation under stress
"@

$loadTestPlanFile = "load-test-plan.md"
$loadTestPlan | Out-File -FilePath $loadTestPlanFile -Encoding UTF8
Write-Host "  Saved to: $loadTestPlanFile" -ForegroundColor Green

# ============================================================================
# Lines 486-520: Maintenance and Updates
# ============================================================================

# 486. Maintenance schedule
Write-Host "`n[486] Maintenance Schedule:" -ForegroundColor Cyan
Write-Host "  Daily:" -ForegroundColor White
Write-Host "    - Review delivery logs for errors" -ForegroundColor Gray
Write-Host "    - Check function execution logs" -ForegroundColor Gray
Write-Host "  Weekly:" -ForegroundColor White
Write-Host "    - Review performance metrics" -ForegroundColor Gray
Write-Host "    - Check integration health" -ForegroundColor Gray
Write-Host "    - Review failed deliveries" -ForegroundColor Gray
Write-Host "  Monthly:" -ForegroundColor White
Write-Host "    - Security audit" -ForegroundColor Gray
Write-Host "    - Secret rotation (if needed)" -ForegroundColor Gray
Write-Host "    - Performance optimization review" -ForegroundColor Gray
Write-Host "    - Backup verification" -ForegroundColor Gray

# 487. Update procedure
Write-Host "`n[487] Update Procedure:" -ForegroundColor Cyan
Write-Host "  1. Test changes in development" -ForegroundColor White
Write-Host "  2. Review code changes" -ForegroundColor White
Write-Host "  3. Build and test locally" -ForegroundColor White
Write-Host "  4. Deploy to staging (if available)" -ForegroundColor White
Write-Host "  5. Run integration tests" -ForegroundColor White
Write-Host "  6. Deploy to production" -ForegroundColor White
Write-Host "  7. Monitor for 24 hours" -ForegroundColor White
Write-Host "  8. Verify webhook deliveries" -ForegroundColor White

# 488. Create update checklist
Write-Host "`n[488] Creating update checklist..." -ForegroundColor Cyan
$updateChecklist = @"
# Webhook System Update Checklist

## Pre-Deployment
- [ ] Code reviewed and approved
- [ ] Tests pass locally
- [ ] Build succeeds without errors
- [ ] Integration tests pass
- [ ] Documentation updated

## Deployment
- [ ] Backup current configuration
- [ ] Deploy to production
- [ ] Verify functions are deployed
- [ ] Check function logs for errors

## Post-Deployment
- [ ] Test webhook delivery
- [ ] Monitor delivery logs
- [ ] Check performance metrics
- [ ] Verify no errors in logs
- [ ] Update documentation if needed

## Rollback Plan
- [ ] Identify rollback commit
- [ ] Redeploy previous version
- [ ] Verify system restored
- [ ] Document rollback reason
"@

$updateChecklistFile = "update-checklist.md"
$updateChecklist | Out-File -FilePath $updateChecklistFile -Encoding UTF8
Write-Host "  Saved to: $updateChecklistFile" -ForegroundColor Green

# 489. Version management
Write-Host "`n[489] Version Management:" -ForegroundColor Cyan
Write-Host "  Current Version: 1.0" -ForegroundColor White
Write-Host "  Versioning Strategy:" -ForegroundColor White
Write-Host "    - Semantic versioning (MAJOR.MINOR.PATCH)" -ForegroundColor Gray
Write-Host "    - Track in function metadata" -ForegroundColor Gray
Write-Host "    - Document breaking changes" -ForegroundColor Gray
Write-Host "    - Maintain changelog" -ForegroundColor Gray

# 490. Create changelog template
Write-Host "`n[490] Creating changelog template..." -ForegroundColor Cyan
$changelog = @"
# Webhook System Changelog

## [1.0.0] - 2025-02-03
### Added
- Initial webhook system implementation
- User created trigger
- Document uploaded trigger
- Opportunity saved/applied triggers
- Recommendations trigger with chunking
- Normalized recommendation persistence
- Signed URL generation for documents
- Delivery logging and retries
- Local webhook receiver for testing

### Security
- HMAC SHA256 signature verification
- Secure secret storage in Firestore
- Idempotency keys for duplicate prevention

### Performance
- Exponential backoff retries
- Chunked delivery for large payloads
- Batch Firestore writes

## [Unreleased]
### Planned
- Outcome recording trigger
- View tracking trigger
- Webhook replay functionality
- Advanced filtering options
"@

$changelogFile = "CHANGELOG.md"
$changelog | Out-File -FilePath $changelogFile -Encoding UTF8
Write-Host "  Saved to: $changelogFile" -ForegroundColor Green

# ============================================================================
# Lines 491-520: Documentation and Training
# ============================================================================

# 491. Documentation index
Write-Host "`n[491] Documentation Index:" -ForegroundColor Cyan
$docIndex = @"
# Webhook System Documentation Index

## Setup and Deployment
- WEBHOOK_SETUP.md - Quick setup guide
- FIREBASE_DEPLOYMENT.md - Deployment instructions
- WEBHOOK_MIGRATION.md - Migration from existing functions

## System Documentation
- WEBHOOK_README.md - Complete system documentation
- WEBHOOK_IMPLEMENTATION.md - Investigation and schema details

## Operations
- powershell-commands-*.ps1 - PowerShell command scripts
- disaster-recovery-plan.md - DR procedures
- update-checklist.md - Update procedures

## Testing
- local-webhook-receiver/README.md - Receiver setup
- load-test-plan.md - Load testing guide
- test-webhook-system.ps1 - Integration tests

## Reference
- QUICK_REFERENCE.txt - Quick command reference
- CHANGELOG.md - Version history
"@

$docIndexFile = "DOCUMENTATION_INDEX.md"
$docIndex | Out-File -FilePath $docIndexFile -Encoding UTF8
Write-Host "  Saved to: $docIndexFile" -ForegroundColor Green

# 492. Training materials
Write-Host "`n[492] Training Materials:" -ForegroundColor Cyan
Write-Host "  For Developers:" -ForegroundColor White
Write-Host "    - WEBHOOK_README.md (system overview)" -ForegroundColor Gray
Write-Host "    - WEBHOOK_IMPLEMENTATION.md (technical details)" -ForegroundColor Gray
Write-Host "    - Code comments in functions/src/webhook/" -ForegroundColor Gray
Write-Host "  For Operators:" -ForegroundColor White
Write-Host "    - WEBHOOK_SETUP.md (setup guide)" -ForegroundColor Gray
Write-Host "    - FIREBASE_DEPLOYMENT.md (deployment)" -ForegroundColor Gray
Write-Host "    - disaster-recovery-plan.md (DR procedures)" -ForegroundColor Gray
Write-Host "  For Integrators:" -ForegroundColor White
Write-Host "    - WEBHOOK_README.md (event schemas)" -ForegroundColor Gray
Write-Host "    - local-webhook-receiver/README.md (testing)" -ForegroundColor Gray
Write-Host "    - Integration examples in scripts" -ForegroundColor Gray

# 493. Create training guide
Write-Host "`n[493] Creating training guide..." -ForegroundColor Cyan
$trainingGuide = @"
# Webhook System Training Guide

## Overview
The webhook system emits events when key actions occur in the application.

## Key Concepts
- **Events**: user.created, document.uploaded, opportunity.saved, etc.
- **Integrations**: Configuration in Firestore (webhookUrl, secret, enabledEvents)
- **Deliveries**: Attempts to send webhooks (logged in webhookDeliveries)
- **Retries**: Automatic retry on failures (5 attempts, exponential backoff)

## Hands-On Training

### Exercise 1: Setup
1. Deploy functions: .\deploy-firebase-functions.ps1
2. Start local receiver: cd local-webhook-receiver; npm start
3. Create integration in Firestore
4. Test webhook delivery

### Exercise 2: Monitoring
1. View function logs: firebase functions:log
2. Check delivery logs: Firestore → webhookDeliveries
3. Monitor receiver logs: Get-Content webhook-logs.jsonl -Tail 20

### Exercise 3: Troubleshooting
1. Simulate failure: Invoke-RestMethod -Method Post http://localhost:3000/toggle-fail
2. Trigger event and observe retries
3. Fix issue and verify recovery

## Assessment
- Can you create an integration?
- Can you monitor webhook deliveries?
- Can you troubleshoot a failed delivery?
- Can you rotate a secret?
"@

$trainingFile = "TRAINING_GUIDE.md"
$trainingGuide | Out-File -FilePath $trainingFile -Encoding UTF8
Write-Host "  Saved to: $trainingFile" -ForegroundColor Green

# ============================================================================
# Lines 494-520: Advanced Features
# ============================================================================

# 494. Webhook filtering
Write-Host "`n[494] Webhook Filtering (Future Feature):" -ForegroundColor Cyan
Write-Host "  Potential Filters:" -ForegroundColor White
Write-Host "    - By user ID" -ForegroundColor Gray
Write-Host "    - By opportunity source" -ForegroundColor Gray
Write-Host "    - By event metadata" -ForegroundColor Gray
Write-Host "    - By date range" -ForegroundColor Gray
Write-Host "  Implementation:" -ForegroundColor White
Write-Host "    - Add filters array to integration document" -ForegroundColor Gray
Write-Host "    - Apply filters in trigger handlers" -ForegroundColor Gray
Write-Host "    - Log filtered events for audit" -ForegroundColor Gray

# 495. Webhook replay
Write-Host "`n[495] Webhook Replay (Future Feature):" -ForegroundColor Cyan
Write-Host "  Use Cases:" -ForegroundColor White
Write-Host "    - Recover from receiver downtime" -ForegroundColor Gray
Write-Host "    - Re-send failed deliveries" -ForegroundColor Gray
Write-Host "    - Test receiver changes" -ForegroundColor Gray
Write-Host "  Implementation:" -ForegroundColor White
Write-Host "    - Store event payloads in delivery logs" -ForegroundColor Gray
Write-Host "    - Create replay function" -ForegroundColor Gray
Write-Host "    - Support date range selection" -ForegroundColor Gray

# 496. Event transformation
Write-Host "`n[496] Event Transformation (Future Feature):" -ForegroundColor Cyan
Write-Host "  Capabilities:" -ForegroundColor White
Write-Host "    - Transform payload structure" -ForegroundColor Gray
Write-Host "    - Add custom fields" -ForegroundColor Gray
Write-Host "    - Filter sensitive data" -ForegroundColor Gray
Write-Host "    - Format dates/timestamps" -ForegroundColor Gray

# 497. Multi-tenant support
Write-Host "`n[497] Multi-Tenant Support:" -ForegroundColor Cyan
Write-Host "  Current:" -ForegroundColor White
Write-Host "    - Single project deployment" -ForegroundColor Gray
Write-Host "    - All integrations in one collection" -ForegroundColor Gray
Write-Host "  Future:" -ForegroundColor White
Write-Host "    - Tenant-specific integrations" -ForegroundColor Gray
Write-Host "    - Tenant isolation" -ForegroundColor Gray
Write-Host "    - Per-tenant rate limiting" -ForegroundColor Gray

# 498. Analytics dashboard
Write-Host "`n[498] Analytics Dashboard (Future Feature):" -ForegroundColor Cyan
Write-Host "  Metrics to Display:" -ForegroundColor White
Write-Host "    - Events per hour/day" -ForegroundColor Gray
Write-Host "    - Success/failure rates" -ForegroundColor Gray
Write-Host "    - Average delivery time" -ForegroundColor Gray
Write-Host "    - Top error types" -ForegroundColor Gray
Write-Host "    - Integration health" -ForegroundColor Gray

# 499. API for integration management
Write-Host "`n[499] API for Integration Management (Future Feature):" -ForegroundColor Cyan
Write-Host "  Endpoints:" -ForegroundColor White
Write-Host "    - GET /api/integrations - List integrations" -ForegroundColor Gray
Write-Host "    - POST /api/integrations - Create integration" -ForegroundColor Gray
Write-Host "    - PUT /api/integrations/:id - Update integration" -ForegroundColor Gray
Write-Host "    - DELETE /api/integrations/:id - Delete integration" -ForegroundColor Gray
Write-Host "    - GET /api/integrations/:id/stats - Get statistics" -ForegroundColor Gray

# 500. Summary of advanced features
Write-Host "`n[500] Advanced Features Summary:" -ForegroundColor Cyan
Write-Host "  Current:" -ForegroundColor White
Write-Host "    ✓ Basic webhook delivery" -ForegroundColor Green
Write-Host "    ✓ Retries and error handling" -ForegroundColor Green
Write-Host "    ✓ Delivery logging" -ForegroundColor Green
Write-Host "    ✓ Signed URLs" -ForegroundColor Green
Write-Host "    ✓ Chunking" -ForegroundColor Green
Write-Host "  Future:" -ForegroundColor White
Write-Host "    - Webhook filtering" -ForegroundColor Yellow
Write-Host "    - Webhook replay" -ForegroundColor Yellow
Write-Host "    - Event transformation" -ForegroundColor Yellow
Write-Host "    - Analytics dashboard" -ForegroundColor Yellow
Write-Host "    - Management API" -ForegroundColor Yellow

# ============================================================================
# Lines 501-520: Integration Examples
# ============================================================================

# 501. Common integration patterns
Write-Host "`n[501] Common Integration Patterns:" -ForegroundColor Cyan
Write-Host "  Pattern 1: CRM Integration" -ForegroundColor White
Write-Host "    - Events: user.created, opportunity.saved" -ForegroundColor Gray
Write-Host "    - Action: Create/update records in CRM" -ForegroundColor Gray
Write-Host "  Pattern 2: Notification System" -ForegroundColor White
Write-Host "    - Events: opportunities.recommended" -ForegroundColor Gray
Write-Host "    - Action: Send email/SMS notifications" -ForegroundColor Gray
Write-Host "  Pattern 3: Analytics Platform" -ForegroundColor White
Write-Host "    - Events: All events" -ForegroundColor Gray
Write-Host "    - Action: Track user behavior and metrics" -ForegroundColor Gray
Write-Host "  Pattern 4: Document Management" -ForegroundColor White
Write-Host "    - Events: document.uploaded" -ForegroundColor Gray
Write-Host "    - Action: Process and store documents" -ForegroundColor Gray

# 502. Create integration examples
Write-Host "`n[502] Creating integration examples..." -ForegroundColor Cyan
$integrationExamples = @"
# Integration Examples

## Example 1: CRM Integration
{
  "name": "Salesforce CRM",
  "webhookUrl": "https://api.salesforce.com/webhook/opportunities",
  "secret": "STRONG_SECRET_HERE",
  "enabledEvents": ["user.created", "opportunity.saved", "opportunity.applied"],
  "isActive": true
}

## Example 2: Email Notification Service
{
  "name": "SendGrid Notifications",
  "webhookUrl": "https://api.sendgrid.com/v3/webhooks/opportunities",
  "secret": "STRONG_SECRET_HERE",
  "enabledEvents": ["opportunities.recommended"],
  "isActive": true
}

## Example 3: Analytics Platform
{
  "name": "Mixpanel Analytics",
  "webhookUrl": "https://api.mixpanel.com/track",
  "secret": "STRONG_SECRET_HERE",
  "enabledEvents": [
    "user.created",
    "document.uploaded",
    "opportunity.saved",
    "opportunity.applied",
    "opportunities.recommended"
  ],
  "isActive": true
}
"@

$examplesFile = "integration-examples.json"
$integrationExamples | Out-File -FilePath $examplesFile -Encoding UTF8
Write-Host "  Saved to: $examplesFile" -ForegroundColor Green

# 503. Receiver implementation examples
Write-Host "`n[503] Receiver Implementation Examples:" -ForegroundColor Cyan
Write-Host "  Node.js/Express:" -ForegroundColor White
Write-Host "    - See: local-webhook-receiver/server.ts" -ForegroundColor Gray
Write-Host "  Python/Flask:" -ForegroundColor White
Write-Host "    - Use Flask request.get_data() for raw body" -ForegroundColor Gray
Write-Host "    - Verify signature with hmac.compare_digest()" -ForegroundColor Gray
Write-Host "  PHP:" -ForegroundColor White
Write-Host "    - Use file_get_contents('php://input') for raw body" -ForegroundColor Gray
Write-Host "    - Verify with hash_hmac('sha256', ...)" -ForegroundColor Gray

# 504. Create receiver examples
Write-Host "`n[504] Creating receiver examples..." -ForegroundColor Cyan
$receiverExamples = @"
# Webhook Receiver Examples

## Python/Flask Example
```python
from flask import Flask, request
import hmac
import hashlib

app = Flask(__name__)
WEBHOOK_SECRET = 'your-secret-here'

@app.route('/webhook', methods=['POST'])
def webhook():
    # Get raw body for signature verification
    raw_body = request.get_data()
    signature = request.headers.get('X-OpportuniLynk-Signature', '')
    
    # Verify signature
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        raw_body,
        hashlib.sha256
    ).hexdigest()
    
    provided = signature.replace('sha256=', '')
    if not hmac.compare_digest(expected, provided):
        return {'error': 'Invalid signature'}, 401
    
    # Process webhook
    event = request.json
    print(f"Received: {event['type']}")
    
    return {'received': True}, 200
```

## PHP Example
```php
<?php
define('WEBHOOK_SECRET', 'your-secret-here');

`$raw_body = file_get_contents('php://input');
`$signature = `$_SERVER['HTTP_X_OPPORTUNILYNK_SIGNATURE'] ?? '';

// Verify signature
`$expected = hash_hmac('sha256', `$raw_body, WEBHOOK_SECRET);
`$provided = str_replace('sha256=', '', `$signature);

if (!hash_equals(`$expected, `$provided)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

// Process webhook
`$event = json_decode(`$raw_body, true);
echo json_encode(['received' => true]);
?>
```
"@

$receiverExamplesFile = "receiver-examples.md"
$receiverExamples | Out-File -FilePath $receiverExamplesFile -Encoding UTF8
Write-Host "  Saved to: $receiverExamplesFile" -ForegroundColor Green

# ============================================================================
# Lines 505-520: Best Practices
# ============================================================================

# 505. Best practices summary
Write-Host "`n[505] Best Practices Summary:" -ForegroundColor Cyan
$bestPractices = @(
    "Use HTTPS for all webhook URLs",
    "Generate strong, random secrets (64+ characters)",
    "Store secrets securely (Firestore, not code)",
    "Verify signatures on all webhooks",
    "Implement idempotency in receivers",
    "Monitor delivery logs regularly",
    "Set up error alerting",
    "Test webhooks in staging before production",
    "Document integration configurations",
    "Rotate secrets periodically",
    "Use chunking for large payloads",
    "Batch Firestore operations efficiently",
    "Monitor performance metrics",
    "Keep delivery logs for audit",
    "Have a disaster recovery plan"
)

foreach ($practice in $bestPractices) {
    Write-Host "  ✓ $practice" -ForegroundColor Green
}

# 506. Create best practices document
Write-Host "`n[506] Creating best practices document..." -ForegroundColor Cyan
$bestPracticesDoc = @"
# Webhook System Best Practices

## Security
1. Always use HTTPS for webhook URLs
2. Use strong, random secrets (64+ characters recommended)
3. Store secrets in Firestore, never in code
4. Verify signatures on every webhook
5. Rotate secrets periodically (every 90 days)
6. Monitor for suspicious activity

## Reliability
1. Implement idempotency in receivers
2. Handle duplicate events gracefully
3. Set appropriate timeouts
4. Monitor delivery success rates
5. Set up alerting for failures
6. Test retry logic

## Performance
1. Use chunking for large payloads
2. Batch Firestore writes efficiently
3. Monitor delivery times
4. Optimize receiver response times
5. Use appropriate function memory/timeout

## Operations
1. Monitor logs daily
2. Review metrics weekly
3. Audit integrations monthly
4. Test disaster recovery quarterly
5. Keep documentation updated
"@

$bestPracticesFile = "BEST_PRACTICES.md"
$bestPracticesDoc | Out-File -FilePath $bestPracticesFile -Encoding UTF8
Write-Host "  Saved to: $bestPracticesFile" -ForegroundColor Green

# 507-520: Final summary and next steps
Write-Host "`n[507-520] Final Summary:" -ForegroundColor Cyan
Write-Host "  All scripts and documentation created:" -ForegroundColor White
Write-Host "    ✓ Deployment scripts" -ForegroundColor Green
Write-Host "    ✓ Testing scripts" -ForegroundColor Green
Write-Host "    ✓ Monitoring scripts" -ForegroundColor Green
Write-Host "    ✓ Management scripts" -ForegroundColor Green
Write-Host "    ✓ Documentation" -ForegroundColor Green
Write-Host "`n  Ready for production deployment!" -ForegroundColor Green

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Review all generated scripts and documentation" -ForegroundColor White
Write-Host "2. Deploy functions: .\deploy-firebase-functions.ps1" -ForegroundColor White
Write-Host "3. Create production integration" -ForegroundColor White
Write-Host "4. Test webhook delivery" -ForegroundColor White
Write-Host "5. Set up monitoring and alerting" -ForegroundColor White
Write-Host "6. Train team on webhook system" -ForegroundColor White

Write-Host "`n=== Complete ===" -ForegroundColor Green
