# Local Webhook Receiver

A local Express server for testing webhook delivery from Firebase Functions.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set webhook secret (optional, defaults to `test-secret-change-me`):
```bash
export WEBHOOK_SECRET=your-secret-here
```

3. Start the server:
```bash
npm start
```

## Expose with ngrok

1. Install ngrok: https://ngrok.com/download

2. Expose local server:
```bash
ngrok http 3000
```

3. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)

## Create Test Integration

Create a document in Firestore at `integrations/{integrationId}`:

```json
{
  "name": "Local Test",
  "webhookUrl": "https://abc123.ngrok.io/webhook",
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

## Testing

### Health Check
```bash
curl http://localhost:3000/health
```

### Toggle Failures (to test retries)
```bash
curl -X POST http://localhost:3000/toggle-fail
```

When failures are enabled, the webhook endpoint will return 500 errors, allowing you to test the sender's retry logic.

## Logs

All webhook requests are logged to `webhook-logs.jsonl` in JSONL format (one JSON object per line).

## Signature Verification

The receiver verifies webhook signatures using HMAC SHA256. The signature is computed over the raw request body bytes.

## Headers Received

- `X-OpportuniLynk-Event`: Event type
- `X-OpportuniLynk-Id`: Event ID
- `Idempotency-Key`: Event ID (for idempotency)
- `X-OpportuniLynk-Signature`: HMAC SHA256 signature
