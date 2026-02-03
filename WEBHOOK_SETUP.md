# Webhook System - Quick Setup Guide

## Prerequisites

- Firebase project configured
- Node.js 22+ installed
- ngrok installed (for local testing)

## Installation

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Build Functions

```bash
cd functions
npm run build
```

### 3. Deploy Functions

```bash
cd functions
firebase deploy --only functions
```

**Note**: The webhook triggers are added to `functions/src/index.ts`. Existing functions (samGov, grantsGov, matchOpportunities, etc.) are preserved and will continue to work.

## Create Test Integration

1. Go to Firebase Console → Firestore
2. Create collection: `integrations`
3. Add document with ID: `test-integration`

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
    "opportunities.recommended"
  ],
  "isActive": true,
  "createdAt": "2025-02-03T00:00:00Z"
}
```

## Local Testing Setup

### 1. Start Local Receiver

```bash
cd local-webhook-receiver
npm install
npm start
```

### 2. Expose with ngrok

```bash
ngrok http 3000
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)

### 3. Update Integration

Update the `webhookUrl` in Firestore to: `https://abc123.ngrok.io/webhook`

### 4. Test

1. Create a new user profile → Should trigger `user.created`
2. Upload a document → Should trigger `document.uploaded` when processing completes
3. Save an opportunity → Should trigger `opportunity.saved`
4. Apply to an opportunity → Should trigger `opportunity.applied`
5. Run matching algorithm → Should trigger `opportunities.recommended`

### 5. View Logs

- Local receiver logs: `local-webhook-receiver/webhook-logs.jsonl`
- Firebase Functions logs: `firebase functions:log`
- Delivery logs: Firestore collection `webhookDeliveries`

## Testing Retries

1. Enable failure mode:
```bash
curl -X POST http://localhost:3000/toggle-fail
```

2. Trigger an event (e.g., save an opportunity)

3. Observe retry attempts in Firebase Functions logs

4. Disable failure mode:
```bash
curl -X POST http://localhost:3000/toggle-fail
```

## Production Setup

1. Create integration document in Firestore with production webhook URL
2. Set strong `secret` (use environment variable or secure storage)
3. Set `isActive: true`
4. Configure `enabledEvents` to only events you need
5. Monitor `webhookDeliveries` collection for delivery status

## Important Notes

### Existing Functions

The webhook system is added alongside existing functions. All existing exports (samGov, grantsGov, matchOpportunities, etc.) are preserved.

### Signed URLs

Document webhooks include **signed download URLs** valid for 7 days. Files are NOT made public. The receiver must use the signed URL before it expires.

### Opportunity Data

The `opportunities.recommended` webhook sends full `Opportunity` objects matching the UI dashboard schema. The receiver does NOT need to call external APIs to get opportunity details.

### Chunking

Large recommendation sets are automatically chunked (25 items per webhook). Multiple webhooks are sent with `page` and `totalPages` fields for reassembly.

### Idempotency

Each webhook event has a unique `id` and `Idempotency-Key` header. Receivers should deduplicate by event ID.

## Troubleshooting

### Webhooks not firing
- Check integration `isActive: true`
- Verify `enabledEvents` includes the event type
- Check Firestore trigger paths match your data structure
- View logs: `firebase functions:log`

### Signature verification fails
- Ensure receiver uses **raw body bytes** (not parsed JSON)
- Verify `WEBHOOK_SECRET` matches integration `secret`
- Check signature format: `sha256=<hex>`

### Delivery failures
- Check `webhookDeliveries` collection for error details
- Verify webhook URL is accessible
- Check receiver logs for errors
- Retries happen automatically (5 attempts with exponential backoff)

## Next Steps

1. Deploy functions: `firebase deploy --only functions`
2. Create integration document
3. Test with local receiver + ngrok
4. Monitor delivery logs
5. Set up production webhook endpoint
6. Configure monitoring/alerting for failed deliveries
