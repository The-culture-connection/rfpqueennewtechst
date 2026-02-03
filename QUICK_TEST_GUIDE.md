# Quick Webhook Testing Guide

## Prerequisites
- ✅ Functions deployed
- Local webhook receiver ready
- ngrok installed

## 5-Minute Test

### 1. Start Receiver
```powershell
cd local-webhook-receiver
npm install  # First time only
npm start
```

### 2. Start ngrok (New Terminal)
```powershell
ngrok http 3000
```
**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### 3. Create Integration in Firestore

**Firebase Console → Firestore → Add Document**

Collection: `integrations`  
Document ID: `test-integration`

```json
{
  "name": "Local Test",
  "webhookUrl": "https://YOUR-NGROK-URL.ngrok.io/webhook",
  "secret": "test-secret-change-me",
  "enabledEvents": ["user.created", "document.uploaded", "opportunity.saved", "opportunity.applied", "opportunities.recommended"],
  "isActive": true,
  "createdAt": "2025-02-03T00:00:00Z"
}
```

### 4. Set Receiver Secret
In receiver terminal:
```powershell
$env:WEBHOOK_SECRET = "test-secret-change-me"
# Restart receiver (Ctrl+C, then npm start)
```

### 5. Test Event

**Create a test user in Firestore:**
- Collection: `profiles`
- Document ID: `test-user-123`
- Fields:
  ```json
  {
    "email": "test@example.com",
    "entityName": "Test Org",
    "createdAt": "2025-02-03T00:00:00Z"
  }
  ```

### 6. Verify

**Check receiver logs:**
```powershell
Get-Content local-webhook-receiver/webhook-logs.jsonl -Tail 3
```

**Check Firestore:**
- Collection: `webhookDeliveries`
- Should see new document with `eventType: "user.created"`

## Success Indicators

✅ Receiver shows: "Webhook received: user.created"  
✅ webhook-logs.jsonl has new entry  
✅ Firestore webhookDeliveries shows `status: "delivered"`  
✅ Function logs show: "[Webhook] User created: test-user-123"

## Next Tests

- Upload document → `document.uploaded`
- Save opportunity → `opportunity.saved`
- Apply to opportunity → `opportunity.applied`
- Run matching → `opportunities.recommended`
