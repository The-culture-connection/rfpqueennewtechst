# Webhook System Implementation

Production-grade outbound webhook system for Firestore changes, with local testing receiver.

## Overview

This system emits webhook events when key actions occur in the application:
- User creation
- Document uploads (with signed download URLs)
- Opportunity actions (saved, applied)
- Algorithm recommendations (normalized and chunked)
- Score updates

## Architecture

### Components

1. **Webhook Sender** (`functions/src/webhook/`)
   - Event building and signing
   - Delivery with retries
   - Delivery logging
   - Integration management

2. **Firestore Triggers** (`functions/src/index.ts`)
   - `onUserCreated`: Profile creation
   - `onDocumentUploadedCreate`: Document created with 'completed' status
   - `onDocumentUploadedUpdate`: Document status changed to 'completed'
   - `onOpportunitySaved`: Opportunity saved to tracker
   - `onOpportunityApplied`: Opportunity marked as applied
   - `onOpportunitiesRecommended`: Algorithm results
   - `onOpportunityAnalyzed`: Score updates
   - `persistRecommendations`: Normalized recommendation storage

3. **Local Receiver** (`local-webhook-receiver/`)
   - Express server for testing
   - Signature verification
   - Request logging
   - Failure simulation

## Setup

### 1. Firebase Functions

The webhook triggers are included in `functions/src/index.ts`. Build and deploy:

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

### 2. Create Integration

Create a document in Firestore at `integrations/{integrationId}`:

```json
{
  "name": "My Integration",
  "webhookUrl": "https://your-endpoint.com/webhook",
  "secret": "your-webhook-secret-here",
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

### 3. Local Testing

1. Start local receiver:
```bash
cd local-webhook-receiver
npm install
npm start
```

2. Expose with ngrok:
```bash
ngrok http 3000
```

3. Update integration `webhookUrl` to ngrok URL + `/webhook`

4. Trigger events in your app and observe logs in `webhook-logs.jsonl`

## Event Types

### `user.created`
**Trigger**: `profiles/{uid}` created

**Payload**:
```json
{
  "id": "evt_...",
  "type": "user.created",
  "createdAt": "2025-02-03T00:00:00Z",
  "data": {
    "userId": "user123",
    "email": "user@example.com",
    "entityName": "Acme Corp",
    "entityType": "nonprofit",
    "fundingType": ["grants", "rfps"],
    "interestsMain": ["healthcare", "education"],
    "createdAt": "2025-02-03T00:00:00Z"
  },
  "source": {
    "projectId": "therfpqueen-f11fd",
    "env": "production",
    "version": "1.0"
  }
}
```

### `document.uploaded`
**Trigger**: `profiles/{uid}/documents/{docId}` processingStatus → 'completed'

**Payload**:
```json
{
  "id": "evt_...",
  "type": "document.uploaded",
  "data": {
    "userId": "user123",
    "documentId": "doc456",
    "fileName": "executive-summary.pdf",
    "contentType": "application/pdf",
    "documentType": "executive-summary",
    "fileSize": 123456,
    "storagePath": "gs://bucket/path/to/file.pdf",
    "downloadUrl": "https://storage.googleapis.com/...?signature=...",
    "expiresAt": "2025-02-10T00:00:00Z",
    "uploadedAt": "2025-02-03T00:00:00Z"
  }
}
```

**Note**: `downloadUrl` is a **signed URL** valid for 7 days. Files are NOT made public.

### `opportunity.saved`
**Trigger**: New opportunity added to `profiles/{uid}/tracker/saved`

**Payload**:
```json
{
  "id": "evt_...",
  "type": "opportunity.saved",
  "data": {
    "userId": "user123",
    "opportunityId": "opp789",
    "opportunity": {
      // Full Opportunity object (UI schema)
      "id": "opp789",
      "title": "Grant Title",
      "agency": "Agency Name",
      "description": "...",
      "winRate": 85,
      "matchScore": 85,
      // ... all other Opportunity fields
    },
    "savedAt": "2025-02-03T00:00:00Z"
  }
}
```

### `opportunity.applied`
**Trigger**: New opportunity added to `profiles/{uid}/tracker/applied`

**Payload**: Same structure as `opportunity.saved`, with `appliedAt` instead of `savedAt`

### `opportunities.recommended`
**Trigger**: Algorithm results saved to `userMatches/{uid}/current/latest`

**Payload** (chunked, 25 items per webhook):
```json
{
  "id": "evt_...",
  "type": "opportunities.recommended",
  "data": {
    "userId": "user123",
    "runId": "run_abc123",
    "batchId": "run_abc123_page_1",
    "page": 1,
    "totalPages": 3,
    "items": [
      {
        "opportunityId": "opp1",
        "externalId": "opp1",
        "source": "grants.gov",
        "opportunity": {
          // Full Opportunity object (UI schema)
          "id": "opp1",
          "title": "...",
          // ... all Opportunity fields
        }
      },
      // ... up to 25 items
    ]
  }
}
```

**Note**: Results are automatically chunked. Multiple webhooks are sent if there are more than 25 opportunities.

### `opportunity.analyzed`
**Trigger**: Scores updated in `userMatches/{uid}/current/latest`

**Payload**:
```json
{
  "id": "evt_...",
  "type": "opportunity.analyzed",
  "data": {
    "userId": "user123",
    "runId": "run_abc123",
    "updatedAt": "2025-02-03T00:00:00Z",
    "matchCount": 50
  }
}
```

## Normalized Recommendation Persistence

When algorithm results are saved, they are also persisted in a normalized structure:

- `profiles/{uid}/recommendationRuns/{runId}` - Run summary
- `profiles/{uid}/recommendationRuns/{runId}/items/{itemId}` - Individual recommendations

This structure allows:
- Querying recommendations by user
- Tracking recommendation history
- Webhook delivery with full opportunity data

## Security

### Signature Verification

All webhooks are signed with HMAC SHA256:

```
X-OpportuniLynk-Signature: sha256=<hex(hmac(secret, rawBodyBytes))>
```

**Receiver must verify signature over raw request body bytes** (not parsed JSON).

### Idempotency

Each event has a unique `id` and `Idempotency-Key` header. Receivers should deduplicate by event ID.

## Retries

- **Max attempts**: 5
- **Backoff**: 250ms, 500ms, 1s, 2s, 4s
- **Retry on**: Network errors, 5xx, 429, 408
- **Don't retry**: Other 4xx errors

## Delivery Logs

All delivery attempts are logged to `webhookDeliveries/{integrationId}_{eventId}`:

```json
{
  "integrationId": "int123",
  "eventId": "evt456",
  "eventType": "user.created",
  "status": "delivered",
  "httpStatus": 200,
  "attempts": 1,
  "createdAt": "2025-02-03T00:00:00Z",
  "updatedAt": "2025-02-03T00:00:00Z",
  "userId": "user123"
}
```

## Testing

### Local Receiver

1. Start receiver: `cd local-webhook-receiver && npm start`
2. Expose with ngrok: `ngrok http 3000`
3. Create integration with ngrok URL
4. Trigger events in app
5. Check `webhook-logs.jsonl` for received events

### Simulate Failures

```bash
curl -X POST http://localhost:3000/toggle-fail
```

This makes the receiver return 500 errors, allowing you to test retry logic.

## Firestore Schema

### Integrations
```
integrations/{integrationId}
  - name: string
  - webhookUrl: string
  - secret: string
  - enabledEvents: string[]
  - isActive: boolean
  - createdAt: timestamp
  - updatedAt?: timestamp
```

### Webhook Deliveries
```
webhookDeliveries/{integrationId}_{eventId}
  - integrationId: string
  - eventId: string
  - eventType: string
  - status: 'delivered' | 'failed'
  - httpStatus?: number
  - attempts: number
  - lastError?: string
  - createdAt: timestamp
  - updatedAt: timestamp
  - userId?: string
  - opportunityId?: string
  - documentId?: string
  - dataSummary?: object
```

### Recommendation Runs
```
profiles/{uid}/recommendationRuns/{runId}
  - userId: string
  - runId: string
  - createdAt: ISO string
  - algorithmVersion: string
  - totalCount: number
  - eligibleCount: number
  - unknownCount: number
  - status: 'completed'
  - runStats?: object

profiles/{uid}/recommendationRuns/{runId}/items/{itemId}
  - userId: string
  - runId: string
  - createdAt: ISO string
  - opportunityId: string
  - externalId: string
  - source: string
  - match: object (TopMatch structure)
```

## Troubleshooting

### Webhooks not firing
1. Check integration `isActive` is `true`
2. Verify `enabledEvents` includes the event type
3. Check Firestore trigger logs: `firebase functions:log`
4. Verify trigger paths match your Firestore structure

### Signature verification fails
1. Ensure receiver uses **raw body bytes** (not parsed JSON)
2. Verify `WEBHOOK_SECRET` matches integration `secret`
3. Check signature format: `sha256=<hex>`

### Retries not working
1. Check delivery logs in `webhookDeliveries` collection
2. Verify receiver returns 5xx for retryable errors
3. Check retry delays are being applied

## Future Enhancements

- [ ] `opportunity.outcome_recorded` trigger (when outcome tracking is implemented)
- [ ] `opportunity.viewed` trigger (if view tracking is added to Firestore)
- [ ] Webhook replay for failed deliveries
- [ ] Webhook filtering by user/opportunity criteria
- [ ] Rate limiting per integration
