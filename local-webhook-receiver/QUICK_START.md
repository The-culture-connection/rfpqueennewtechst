# Quick Start: Test Webhook Locally

## Step 1: Start the Local Webhook Receiver

### Option A: Using PowerShell Script (Windows)
```powershell
cd local-webhook-receiver
.\start-webhook-receiver.ps1
```

### Option B: Manual Start
```powershell
cd local-webhook-receiver
npm start
```

The server will start on `http://localhost:3000`

**Keep this terminal open!** The server needs to keep running.

## Step 2: Expose with ngrok

In a **NEW terminal window**, run:

```powershell
ngrok http 3000
```

You'll see output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

**Keep ngrok running!** If you close it, you'll get a new URL.

## Step 3: Create Integration in Firestore

### Using Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/project/therfpqueen-f11fd/firestore)
2. Navigate to Firestore Database
3. Click "Start collection" or select `integrations` collection
4. Create a new document with ID: `local-test`
5. Add these fields:

| Field | Type | Value |
|-------|------|-------|
| `name` | string | `Local Test Integration` |
| `webhookUrl` | string | `https://YOUR-NGROK-URL.ngrok.io/webhook` |
| `secret` | string | `test-secret-change-me` |
| `enabledEvents` | array | `["user.created", "document.uploaded", "opportunity.saved", "opportunity.applied", "opportunities.recommended", "opportunity.analyzed"]` |
| `isActive` | boolean | `true` |
| `createdAt` | timestamp | (current time) |

**Important:** Replace `YOUR-NGROK-URL` with your actual ngrok URL!

### Using Firebase CLI

```powershell
# Set your ngrok URL
$ngrokUrl = "https://abc123.ngrok.io"  # Replace with your ngrok URL

# Create integration
firebase firestore:set integrations/local-test `
  "name=Local Test Integration" `
  "webhookUrl=$ngrokUrl/webhook" `
  "secret=test-secret-change-me" `
  "enabledEvents=[user.created,document.uploaded,opportunity.saved,opportunity.applied,opportunities.recommended,opportunity.analyzed]" `
  "isActive=true" `
  "createdAt=$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')"
```

## Step 4: Test the Webhook

### Test 1: Health Check
```powershell
curl http://localhost:3000/health
```

Should return: `{"status":"ok","timestamp":"..."}`

### Test 2: Trigger a Webhook Event

**Option A: Create a User Profile**
1. Go to Firestore Console
2. Create document: `profiles/test-user-123`
3. Add fields:
   - `email`: `test@example.com`
   - `entityName`: `Test Company`
   - `createdAt`: (timestamp)
4. Check your webhook receiver terminal - you should see a webhook event!

**Option B: Upload a Document**
1. Create document: `profiles/test-user-123/documents/test-doc-456`
2. Add fields:
   - `processingStatus`: `completed`
   - `fileName`: `test.pdf`
   - `uploadedAt`: (timestamp)
3. Check your webhook receiver terminal!

### Test 3: View Logs

Webhook requests are logged to:
- **Console output** (in the terminal running the server)
- **webhook-logs.jsonl** file (in the local-webhook-receiver directory)

## Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Verify dependencies: `npm install`

### ngrok not working
- Make sure ngrok is installed: https://ngrok.com/download
- Check firewall isn't blocking ngrok
- Try restarting ngrok

### Webhooks not arriving
1. ✅ Verify integration `isActive: true`
2. ✅ Check `webhookUrl` includes `/webhook` path
3. ✅ Verify ngrok is still running
4. ✅ Check event type is in `enabledEvents` array
5. ✅ Check Firebase Functions logs: `firebase functions:log`

### Signature verification fails
- Ensure `secret` in Firestore matches: `test-secret-change-me`
- Check webhook receiver is using the same secret

### ngrok URL changed
- Update `webhookUrl` in Firestore when ngrok restarts
- Free ngrok gives new URL each restart

## Next Steps

Once testing works locally:
1. Set up a production webhook endpoint
2. Update integration with production URL
3. Use a strong secret (not `test-secret-change-me`)
4. Monitor webhook deliveries in Firestore: `webhookDeliveries` collection
