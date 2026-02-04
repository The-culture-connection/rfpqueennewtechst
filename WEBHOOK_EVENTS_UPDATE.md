# Webhook Events Update - Complete Implementation

## Overview

This update adds three new webhook events to track opportunity interactions:
1. **opportunity.viewed** - When an opportunity is viewed by a user
2. **opportunity.passed** - When an opportunity is marked as passed
3. **opportunity.outcome_recorded** - When a user records if they won or lost an opportunity

## New Webhook Events

### 1. `opportunity.viewed`

**Trigger:** When an opportunity is displayed to a user on the dashboard

**Firestore Path:** `profiles/{userId}/opportunityViews/{opportunityId}`

**Payload:**
```json
{
  "id": "evt_...",
  "type": "opportunity.viewed",
  "createdAt": "2025-02-03T00:00:00Z",
  "data": {
    "userId": "user123",
    "opportunityId": "opp456",
    "opportunity": { /* full opportunity object */ },
    "viewedAt": "2025-02-03T00:00:00Z"
  }
}
```

**Implementation:**
- Client calls `/api/opportunity-viewed` when opportunity is displayed
- API writes to Firestore `profiles/{userId}/opportunityViews/{opportunityId}`
- Firestore trigger `onOpportunityViewed` emits webhook

### 2. `opportunity.passed`

**Trigger:** When an opportunity is marked as passed (user clicks "Pass")

**Firestore Path:** `profiles/{userId}/dashboard/passed`

**Payload:**
```json
{
  "id": "evt_...",
  "type": "opportunity.passed",
  "createdAt": "2025-02-03T00:00:00Z",
  "data": {
    "userId": "user123",
    "opportunityId": "opp456",
    "opportunity": { /* opportunity data */ },
    "passedAt": "2025-02-03T00:00:00Z"
  }
}
```

**Implementation:**
- User clicks "Pass" on dashboard
- Opportunity saved to `profiles/{userId}/dashboard/passed`
- Firestore trigger `onOpportunityPassed` detects new opportunity and emits webhook

### 3. `opportunity.outcome_recorded`

**Trigger:** When a user records if they won or lost an applied opportunity

**Firestore Path:** `profiles/{userId}/tracker/applied` (opportunity updated with `outcome` field)

**Payload:**
```json
{
  "id": "evt_...",
  "type": "opportunity.outcome_recorded",
  "createdAt": "2025-02-03T00:00:00Z",
  "data": {
    "userId": "user123",
    "opportunityId": "opp456",
    "outcome": "won", // or "lost"
    "opportunity": { /* full opportunity object */ },
    "recordedAt": "2025-02-03T00:00:00Z",
    "notes": "Optional notes"
  }
}
```

**Implementation:**
- User records outcome in Tracker page (Applied tab)
- Opportunity in `profiles/{userId}/tracker/applied` is updated with `outcome` field
- Firestore trigger `onOpportunityOutcomeRecorded` detects outcome change and emits webhook

## UI Changes

### Tracker Page - Outcome Recording

**Location:** `src/app/tracker/page.tsx`

**New Features:**
- Applied opportunities now show a "Record Outcome (Won/Lost)" button
- Clicking opens a modal to select "Won" or "Lost"
- Once recorded, shows status badge (green for Won, red for Lost)
- Users can change the outcome later

**How to Use:**
1. Go to Tracker page
2. Click "Applied" tab
3. Find an applied opportunity
4. Click "Record Outcome (Won/Lost)"
5. Select "Won" or "Lost"
6. Outcome is saved and webhook is triggered

## Firebase Functions

### New Functions

1. **`onOpportunityViewed`**
   - Trigger: `profiles/{userId}/opportunityViews/{opportunityId}` created
   - Handler: `handleOpportunityViewed`

2. **`onOpportunityPassed`**
   - Trigger: `profiles/{userId}/dashboard/passed` updated
   - Handler: `handleOpportunityPassed`

3. **`onOpportunityOutcomeRecorded`**
   - Trigger: `profiles/{userId}/tracker/applied` updated (outcome field changed)
   - Handler: `handleOpportunityOutcomeRecorded`

### Updated Files

- `functions/src/index.ts` - Added new triggers
- `functions/src/webhook/triggers.ts` - Added new handlers

## API Routes

### New Route: `/api/opportunity-viewed`

**Method:** POST

**Request Body:**
```json
{
  "userId": "user123",
  "opportunityId": "opp456",
  "opportunity": { /* opportunity object */ }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Opportunity view tracked"
}
```

## Integration Setup

### Update Firestore Integration

Add the new event types to your integration document:

```json
{
  "name": "Local Test Integration",
  "webhookUrl": "https://your-ngrok-url.ngrok.io/webhook",
  "secret": "test-secret-change-me",
  "enabledEvents": [
    "user.created",
    "document.uploaded",
    "opportunity.viewed",        // NEW
    "opportunity.saved",
    "opportunity.applied",
    "opportunity.passed",        // NEW
    "opportunity.outcome_recorded", // NEW
    "opportunities.recommended",
    "opportunity.analyzed"
  ],
  "isActive": true,
  "createdAt": "2025-02-03T00:00:00Z"
}
```

## Testing

### Test opportunity.viewed

1. Go to Dashboard
2. View an opportunity (it should be displayed)
3. Check webhook receiver logs
4. Should see `opportunity.viewed` event

### Test opportunity.passed

1. Go to Dashboard
2. Click "Pass" on an opportunity
3. Check webhook receiver logs
4. Should see `opportunity.passed` event

### Test opportunity.outcome_recorded

1. Go to Tracker page
2. Click "Applied" tab
3. Find an applied opportunity
4. Click "Record Outcome (Won/Lost)"
5. Select "Won" or "Lost"
6. Check webhook receiver logs
7. Should see `opportunity.outcome_recorded` event

## Deployment

### 1. Build Functions

```bash
cd functions
npm run build
```

### 2. Deploy Functions

```bash
firebase deploy --only functions:onOpportunityViewed,functions:onOpportunityPassed,functions:onOpportunityOutcomeRecorded
```

Or deploy all functions:

```bash
firebase deploy --only functions
```

### 3. Update Integration

Update your Firestore integration document with the new event types (see Integration Setup above).

## Summary of All Webhook Events

| Event Type | Trigger | Firestore Path |
|------------|---------|----------------|
| `user.created` | User profile created | `profiles/{userId}` |
| `document.uploaded` | Document processing completed | `profiles/{userId}/documents/{docId}` |
| `opportunity.viewed` | Opportunity displayed | `profiles/{userId}/opportunityViews/{oppId}` |
| `opportunity.saved` | Opportunity saved | `profiles/{userId}/tracker/saved` |
| `opportunity.applied` | Opportunity applied | `profiles/{userId}/tracker/applied` |
| `opportunity.passed` | Opportunity passed | `profiles/{userId}/dashboard/passed` |
| `opportunity.outcome_recorded` | Outcome recorded (won/lost) | `profiles/{userId}/tracker/applied` |
| `opportunities.recommended` | Algorithm results saved | `userMatches/{userId}/current/latest` |
| `opportunity.analyzed` | Scores updated | `userMatches/{userId}/current/latest` |

## Notes

- **Opportunity Viewed**: Tracks when opportunities are first displayed to users. This helps understand engagement.
- **Opportunity Passed**: Tracks when users explicitly pass on opportunities. This helps refine recommendations.
- **Outcome Recorded**: Tracks win/loss outcomes for applied opportunities. This helps measure success rates and improve matching.

All events include the full opportunity object in the payload for complete context.
