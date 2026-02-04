# Testing Webhooks with Local Receiver

## Step-by-Step Testing Guide

### Step 1: Start Local Webhook Receiver

```powershell
# Navigate to receiver directory
cd local-webhook-receiver

# Install dependencies (first time only)
npm install

# Start the receiver
npm start
```

You should see:
```
🚀 Local webhook receiver running on http://localhost:3000
📝 Logs will be saved to webhook-logs.jsonl
```

**Keep this terminal open** - the receiver needs to keep running.

### Step 2: Expose Receiver with ngrok

Open a **new terminal/PowerShell window** and run:

```powershell
# If ngrok is installed globally
ngrok http 3000

# Or if using ngrok from a specific path
# C:\Users\YourName\AppData\Local\ngrok\ngrok.exe http 3000
```

You'll see output like:
```
Forwarding  https://abc123def456.ngrok.io -> http://localhost:3000
```

**Copy the HTTPS URL** (e.g., `https://abc123def456.ngrok.io`)

### Step 3: Create Integration in Firestore

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `therfpqueen-f11fd`
3. Go to **Firestore Database**
4. Create collection: `integrations` (if it doesn't exist)
5. Add a document with ID: `test-integration`
6. Paste this JSON (replace `YOUR-NGROK-URL` with your ngrok URL):

```json
{
  "name": "Local Test Integration",
  "webhookUrl": "https://YOUR-NGROK-URL.ngrok.io/webhook",
  "secret": "test-secret-change-me",
  "enabledEvents": [
    "user.created",
    "document.uploaded",
    "opportunity.saved",
    "opportunity.applied",
    "opportunities.recommended",
    "opportunity.analyzed"
  ],
  "isActive": true,
  "createdAt": "2025-02-03T00:00:00Z"
}
```

**Important:** Replace `YOUR-NGROK-URL` with your actual ngrok URL (e.g., `abc123def456`)

### Step 4: Set Receiver Secret

In the terminal where the receiver is running, set the environment variable:

```powershell
# PowerShell
$env:WEBHOOK_SECRET = "test-secret-change-me"

# Then restart the receiver (Ctrl+C, then npm start again)
```

Or create a `.env` file in `local-webhook-receiver/`:
```
WEBHOOK_SECRET=test-secret-change-me
```

### Step 5: Test Each Webhook Event

#### Test 1: user.created

1. Go to Firebase Console → Firestore
2. Create a new document in `profiles` collection
3. Document ID: `test-user-123` (or any test ID)
4. Add fields:
   ```json
   {
     "email": "test@example.com",
     "entityName": "Test Organization",
     "entityType": "nonprofit",
     "fundingType": ["grants"],
     "interestsMain": ["healthcare"],
     "createdAt": "2025-02-03T00:00:00Z"
   }
   ```

5. **Check receiver logs:**
   ```powershell
   Get-Content local-webhook-receiver/webhook-logs.jsonl -Tail 5
   ```

6. **Check delivery logs in Firestore:**
   - Collection: `webhookDeliveries`
   - Look for document with `eventType: "user.created"`

#### Test 2: document.uploaded

1. Go to Firestore
2. Navigate to: `profiles/{someUserId}/documents`
3. Create a document (or update existing)
4. Set `processingStatus` to `"completed"`
5. Add other fields:
   ```json
   {
     "fileName": "test-document.pdf",
     "fileType": "application/pdf",
     "documentType": "executive-summary",
     "processingStatus": "completed",
     "storageUrl": "gs://bucket/path/to/file.pdf",
     "uploadedAt": "2025-02-03T00:00:00Z"
   }
   ```

6. **Check receiver logs** - should see `document.uploaded` event

#### Test 3: opportunity.saved

1. Go to Firestore
2. Navigate to: `profiles/{userId}/tracker/saved`
3. If document doesn't exist, create it
4. Update the `opportunities` array field:
   ```json
   {
     "opportunities": [
       {
         "id": "test-opp-123",
         "title": "Test Grant Opportunity",
         "agency": "Test Agency",
         "source": "grants.gov",
         "winRate": 85,
         "savedAt": "2025-02-03T00:00:00Z",
         "status": "saved"
       }
     ]
   }
   ```

5. **Check receiver logs** - should see `opportunity.saved` event

#### Test 4: opportunity.applied

Same as Test 3, but:
- Navigate to: `profiles/{userId}/tracker/applied`
- Add to `opportunities` array with `status: "applied"`

#### Test 5: opportunities.recommended

1. Go to Firestore
2. Navigate to: `userMatches/{userId}/current/latest`
3. Create a document with:
   ```json
   {
     "runId": "test-run-123",
     "updatedAt": "2025-02-03T00:00:00Z",
     "topMatches": [
       {
         "opportunityId": "opp-1",
         "scores": { "rankingScore": 85 },
         "eligibility": { "status": "eligible" }
       },
       {
         "opportunityId": "opp-2",
         "scores": { "rankingScore": 75 },
         "eligibility": { "status": "eligible" }
       }
     ],
     "unknownEligibilityMatches": []
   }
   ```

4. **Check receiver logs** - should see `opportunities.recommended` event (chunked if >25 items)

### Step 6: Verify Webhook Delivery

**Check receiver logs:**
```powershell
# View all logs
Get-Content local-webhook-receiver/webhook-logs.jsonl

# View last 10 events
Get-Content local-webhook-receiver/webhook-logs.jsonl -Tail 10

# Filter by event type
Get-Content local-webhook-receiver/webhook-logs.jsonl | Select-String "user.created"
```

**Check Firestore delivery logs:**
- Collection: `webhookDeliveries`
- Query: Filter by `integrationId: "test-integration"`
- Check `status` field: should be `"delivered"`

**Check Firebase Functions logs:**
```powershell
firebase functions:log --only onUserCreated
firebase functions:log --only onDocumentUploadedCreate
```

### Step 7: Test Retry Logic

1. **Enable failure mode:**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/toggle-fail" -Method Post
   ```

2. **Trigger an event** (e.g., create a user profile)

3. **Check function logs** - should see retry attempts:
   ```powershell
   firebase functions:log | Select-String "retry|attempt"
   ```

4. **Check delivery logs** - should show `attempts: 5` and `status: "failed"`

5. **Disable failure mode:**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/toggle-fail" -Method Post
   ```

6. **Trigger another event** - should succeed now

### Troubleshooting

**Webhook not firing?**
- Check integration `isActive: true`
- Verify `enabledEvents` includes the event type
- Check Firestore trigger paths match your data structure
- View function logs: `firebase functions:log`

**Receiver not receiving?**
- Verify ngrok is running and URL is correct
- Check integration `webhookUrl` matches ngrok URL + `/webhook`
- Verify `secret` matches receiver `WEBHOOK_SECRET`
- Check receiver logs for errors

**Signature verification fails?**
- Ensure `secret` in Firestore matches `WEBHOOK_SECRET` in receiver
- Verify receiver uses raw body bytes (already implemented in server.ts)

**Delivery fails?**
- Check receiver is accessible: `Invoke-WebRequest https://YOUR-NGROK-URL.ngrok.io/health`
- Check receiver logs for errors
- Verify receiver returns 200 on success

### Quick Test Commands

```powershell
# Health check
Invoke-RestMethod http://localhost:3000/health

# View recent logs
Get-Content local-webhook-receiver/webhook-logs.jsonl -Tail 5

# Clear logs (if needed)
Clear-Content local-webhook-receiver/webhook-logs.jsonl

# Check if receiver is running
Test-NetConnection -ComputerName localhost -Port 3000
```

### Expected Results

When you trigger an event, you should see:

1. **In receiver terminal:**
   ```
   [2025-02-03T...] Webhook received:
     Event Type: user.created
     Event ID: evt_...
     ✅ Signature verified
     ✅ Webhook processed successfully
   ```

2. **In webhook-logs.jsonl:**
   ```json
   {"timestamp":"...","eventType":"user.created","eventId":"evt_...","payload":{...}}
   ```

3. **In Firestore webhookDeliveries:**
   - Document with `status: "delivered"`
   - `httpStatus: 200`
   - `attempts: 1`

4. **In Firebase Functions logs:**
   ```
   [Webhook] User created: test-user-123
   ```

Ready to test? Start with Step 1!
