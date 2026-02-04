# Testing Webhooks with ngrok - Step-by-Step Guide

This guide will help you test your Firebase Cloud Functions webhooks using ngrok.

## Prerequisites

✅ You have downloaded ngrok  
✅ You have Node.js installed  
✅ Your Firebase Functions are deployed (or you're using the emulator)

## Step 1: Start the Local Webhook Receiver

The local webhook receiver is a test server that will receive webhook events from your Firebase Functions.

### Option A: Using PowerShell Script (Recommended)

```powershell
cd local-webhook-receiver
.\start-webhook-receiver.ps1
```

### Option B: Manual Start

```powershell
cd local-webhook-receiver
npm install
npm start
```

**Expected Output:**
```
🚀 Local webhook receiver running on http://localhost:3000
📝 Logs will be saved to webhook-logs.jsonl
```

**Keep this terminal window open!** The server needs to keep running.

## Step 2: Expose with ngrok

### 2.1 Open a NEW Terminal Window

Open a **new PowerShell terminal** (keep the webhook receiver running in the first terminal).

### 2.2 Start ngrok

In the new terminal, run:

```powershell
ngrok http 3000
```

**Expected Output:**
```
ngrok                                                                              
                                                                                   
Session Status                online                                              
Account                       Your Name (Plan: Free)                              
Version                       3.x.x                                               
Region                        United States (us)                                  
Latency                       -                                                   
Web Interface                 http://127.0.0.1:4040                              
Forwarding                    https://abc123.ngrok.io -> http://localhost:3000   
                                                                                   
Connections                   ttl     opn     rt1     rt5     p50     p90         
                              0       0       0.00    0.00    0.00    0.00        
```

### 2.3 Copy Your ngrok URL

Look for the line that says `Forwarding`. Copy the **HTTPS URL** (the one starting with `https://`).

**Example:** `https://abc123.ngrok.io`

**Important Notes:**
- The ngrok URL changes every time you restart ngrok (free tier)
- Keep ngrok running while testing
- You can view webhook requests at `http://127.0.0.1:4040` (ngrok web interface)

## Step 3: Create Integration in Firestore

Your Firebase Functions need to know where to send webhooks. Create an integration document in Firestore.

### Option A: Using Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database**
4. Click **Start collection** (if `integrations` doesn't exist)
5. Collection ID: `integrations`
6. Document ID: `local-test` (or auto-generate)
7. Add these fields:

| Field | Type | Value |
|-------|------|-------|
| `name` | string | `Local Test Integration` |
| `webhookUrl` | string | `https://YOUR-NGROK-URL.ngrok.io/webhook` ⚠️ **Replace with your ngrok URL!** |
| `secret` | string | `test-secret-change-me` |
| `enabledEvents` | array | Add these items: `user.created`, `document.uploaded`, `opportunity.saved`, `opportunity.applied`, `opportunities.recommended`, `opportunity.analyzed` |
| `isActive` | boolean | `true` |
| `createdAt` | timestamp | Current date/time |

**Example `webhookUrl`:** `https://abc123.ngrok.io/webhook`

### Option B: Using Firebase CLI

```powershell
# Replace abc123.ngrok.io with your actual ngrok URL
$ngrokUrl = "https://abc123.ngrok.io"

firebase firestore:set integrations/local-test `
  name="Local Test Integration" `
  webhookUrl="$ngrokUrl/webhook" `
  secret="test-secret-change-me" `
  enabledEvents="[user.created,document.uploaded,opportunity.saved,opportunity.applied,opportunities.recommended,opportunity.analyzed]" `
  isActive=true `
  createdAt="$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')"
```

## Step 4: Test Your Webhooks

Now you're ready to test! Here's how to trigger each webhook:

### Test 1: `onUserCreated` → `user.created`

**Trigger:** Create a new user profile in Firestore

1. Go to Firestore Console
2. Navigate to `profiles` collection
3. Create a new document with any ID (e.g., `test-user-123`)
4. Add some fields like:
   - `email`: `test@example.com`
   - `entityName`: `Test Company`
   - `createdAt`: Current timestamp

**Check Results:**
- Look at your webhook receiver terminal - you should see a log entry
- Check `local-webhook-receiver/webhook-logs.jsonl` file
- Check ngrok web interface at `http://127.0.0.1:4040`

### Test 2: `onDocumentUploadedCreate` / `onDocumentUploadedUpdate` → `document.uploaded`

**Trigger:** Upload a document or update processing status

1. In Firestore, go to `profiles/{userId}/documents`
2. Create a document or update an existing one
3. Set `processingStatus` to `completed`

**Check Results:** Same as above

### Test 3: `onOpportunitySaved` → `opportunity.saved`

**Trigger:** Add an opportunity to saved tracker

1. In Firestore, go to `profiles/{userId}/tracker/saved`
2. Update the document to add an opportunity to the `opportunities` array

### Test 4: `onOpportunityApplied` → `opportunity.applied`

**Trigger:** Add an opportunity to applied tracker

1. In Firestore, go to `profiles/{userId}/tracker/applied`
2. Update the document to add an opportunity to the `opportunities` array

### Test 5: `onOpportunitiesRecommended` → `opportunities.recommended`

**Trigger:** Create algorithm results

1. In Firestore, go to `userMatches/{userId}/current/latest`
2. Create a document with `topMatches` array and `runId`

### Test 6: `onOpportunityAnalyzed` → `opportunity.analyzed`

**Trigger:** Update match scores

1. In Firestore, update `userMatches/{userId}/current/latest`
2. Change the `topMatches` array with different scores

## Step 5: View Logs

### Local Receiver Logs

All webhook requests are logged to:
```
local-webhook-receiver/webhook-logs.jsonl
```

This is a JSONL file (one JSON object per line) containing:
- Timestamp
- Event type
- Event ID
- Full payload
- Headers

### ngrok Web Interface

Visit `http://127.0.0.1:4040` in your browser to see:
- All HTTP requests
- Request/response details
- Replay requests

### Firebase Functions Logs

```powershell
firebase functions:log
```

## Troubleshooting

### Webhook not receiving events?

1. ✅ Check integration `isActive` is `true` in Firestore
2. ✅ Verify `webhookUrl` includes `/webhook` path
3. ✅ Check ngrok is still running (URL might have changed)
4. ✅ Verify event type is in `enabledEvents` array
5. ✅ Check Firebase Functions are deployed: `firebase functions:list`
6. ✅ Check Firebase Functions logs: `firebase functions:log`

### Signature verification fails?

- Ensure `secret` in Firestore matches the one in your local receiver
- Default secret: `test-secret-change-me`
- You can change it by setting `WEBHOOK_SECRET` environment variable

### ngrok URL changed?

- Update the `webhookUrl` in Firestore when ngrok restarts
- ngrok free tier gives you a new URL each time
- Consider using ngrok's static domain (paid feature) for testing

### Functions not triggering?

1. Check if functions are deployed: `firebase functions:list`
2. Verify the Firestore paths match exactly:
   - `profiles/{userId}` for user created
   - `profiles/{userId}/documents/{documentId}` for documents
   - etc.
3. Check Firebase Functions logs for errors

### Test the receiver directly

```powershell
# Health check
curl http://localhost:3000/health

# Test webhook endpoint (will fail signature, but tests connectivity)
curl -X POST http://localhost:3000/webhook -H "Content-Type: application/json" -d '{"test": "data"}'
```

## Quick Reference

### Your Functions

- `onUserCreated` → `user.created`
- `onDocumentUploadedCreate` → `document.uploaded`
- `onDocumentUploadedUpdate` → `document.uploaded`
- `onOpportunitySaved` → `opportunity.saved`
- `onOpportunityApplied` → `opportunity.applied`
- `onOpportunitiesRecommended` → `opportunities.recommended`
- `onOpportunityAnalyzed` → `opportunity.analyzed`
- `persistRecommendations` → (internal, no webhook)

### Local Receiver Endpoints

- `GET /` - Service info
- `GET /health` - Health check
- `POST /webhook` - Webhook receiver
- `POST /toggle-fail` - Toggle failure mode (for testing retries)

### Default Secret

- `test-secret-change-me` (change this in production!)

## Next Steps

Once testing is complete:

1. Deploy your functions to production
2. Set up a production webhook endpoint
3. Create a production integration in Firestore
4. Use a secure webhook secret
5. Monitor webhook delivery logs in Firestore (`webhookDeliveries` collection)
