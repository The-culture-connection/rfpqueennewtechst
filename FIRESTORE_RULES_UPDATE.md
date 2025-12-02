# Firestore Rules Update for User Feedback

## Problem
Users were getting "Missing or insufficient permissions" errors when trying to submit feedback.

## Solution
Added rules for the "User Feedback" collection in `firestore.rules`:

```javascript
// User Feedback collection - authenticated users can write their own feedback
match /User Feedback/{feedbackId} {
  allow read: if request.auth != null; // Users can read all feedback (for admin purposes)
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
}
```

## How to Deploy

1. **Update Firestore Rules in Firebase Console:**
   - Go to Firebase Console → Firestore Database → Rules
   - Copy the contents of `firestore.rules`
   - Paste into the rules editor
   - Click "Publish"

2. **Or use Firebase CLI:**
   ```bash
   firebase deploy --only firestore:rules
   ```

## What Changed

- Added permission rules for "User Feedback" collection
- Users can create feedback (must match their userId)
- Users can read all feedback (for potential admin features)
- Users can only update/delete their own feedback
- All other collections remain unchanged

## Testing

After deploying, users should be able to:
- ✅ Submit feedback without permission errors
- ✅ Submit multiple feedback entries (continuous feedback)
- ✅ See their feedback submission count

