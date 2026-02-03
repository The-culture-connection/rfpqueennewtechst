# Webhook System - PowerShell Quick Start

Quick PowerShell commands for setting up and testing the webhook system.

## 1. Setup Local Receiver

```powershell
# Navigate to receiver directory
cd local-webhook-receiver

# Install dependencies
npm install

# Start receiver (keeps running)
npm start
```

## 2. Expose with ngrok

```powershell
# If ngrok is installed
ngrok http 3000

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
```

## 3. Create Integration in Firestore

### Option A: Via Firebase Console
1. Go to Firebase Console → Firestore
2. Create collection: `integrations`
3. Add document ID: `test-integration`
4. Paste this JSON:

```json
{
  "name": "Local Test",
  "webhookUrl": "https://YOUR-NGROK-URL.ngrok.io/webhook",
  "secret": "test-secret-change-me",
  "enabledEvents": [
    "user.created",
    "document.uploaded",
    "opportunity.saved",
    "opportunity.applied",
    "opportunities.recommended"
  ],
  "isActive": true,
  "createdAt": "2025-02-03T00:00:00Z"
}
```

### Option B: Via PowerShell (Firebase Admin SDK)

```powershell
# If you have Firebase Admin SDK set up
# Use the script in webhook-powershell-commands.ps1
```

## 4. Test Webhook Receiver

```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get

# Toggle failure mode (to test retries)
Invoke-RestMethod -Uri "http://localhost:3000/toggle-fail" -Method Post

# Check logs
Get-Content local-webhook-receiver/webhook-logs.jsonl -Tail 20
```

## 5. Deploy Firebase Functions

```powershell
cd functions
npm install
npm run build
firebase deploy --only functions
```

## 6. Monitor Webhook Deliveries

```powershell
# View Firebase Functions logs
firebase functions:log

# Or view in Firebase Console:
# Firestore → webhookDeliveries collection
```

## 7. Test Events

Trigger these actions in your app to test webhooks:

1. **user.created**: Create a new user profile
2. **document.uploaded**: Upload a document (wait for processing to complete)
3. **opportunity.saved**: Save an opportunity from dashboard
4. **opportunity.applied**: Mark opportunity as applied
5. **opportunities.recommended**: Run the matching algorithm

## 8. View Logs

```powershell
# Local receiver logs (JSONL format)
Get-Content local-webhook-receiver/webhook-logs.jsonl -Tail 50

# Filter by event type
Get-Content local-webhook-receiver/webhook-logs.jsonl | 
    Select-String "user.created"

# Clear logs
Clear-Content local-webhook-receiver/webhook-logs.jsonl
```

## 9. Troubleshooting

```powershell
# Check if receiver is running
Test-NetConnection -ComputerName localhost -Port 3000

# Check Node processes
Get-Process node

# Stop all Node processes (if needed)
Get-Process node | Stop-Process

# Restart receiver
cd local-webhook-receiver
npm start
```

## 10. Full Automation Script

Run the complete setup script:

```powershell
# Execute the PowerShell script
.\webhook-powershell-commands.ps1
```

This script will:
- Install dependencies
- Start local receiver
- Generate integration JSON
- Provide test commands
- Show monitoring commands

## Quick Reference

| Action | Command |
|--------|---------|
| Start receiver | `cd local-webhook-receiver && npm start` |
| Health check | `Invoke-RestMethod http://localhost:3000/health` |
| Toggle failures | `Invoke-RestMethod -Method Post http://localhost:3000/toggle-fail` |
| View logs | `Get-Content local-webhook-receiver/webhook-logs.jsonl -Tail 20` |
| Deploy functions | `cd functions && npm run build && firebase deploy --only functions` |
| View Firebase logs | `firebase functions:log` |

## Next Steps

1. ✅ Start local receiver
2. ✅ Expose with ngrok
3. ✅ Create integration in Firestore
4. ✅ Deploy Firebase Functions
5. ✅ Trigger events in app
6. ✅ Monitor logs

For detailed documentation, see:
- `WEBHOOK_README.md` - Complete system docs
- `WEBHOOK_SETUP.md` - Setup guide
- `WEBHOOK_IMPLEMENTATION.md` - Investigation results
