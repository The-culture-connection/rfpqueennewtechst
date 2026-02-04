# Fix Terms Acceptance Permission Error

## Problem
Getting `permission-denied` error when accepting terms locally, even though it works on production.

## Root Cause
The Firestore rules file (`firestore.rules`) was missing rules for the `users` collection, which the code tries to write to.

## Changes Made

### 1. Updated Firestore Rules (`firestore.rules`)
Added rules for the `users` collection:
```javascript
// Users collection - for matching system version tracking
match /users/{userId} {
  // Users can read and write their own user document
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

### 2. Updated AuthProvider (`src/components/AuthProvider.tsx`)
- Fixed scope issue with `currentProfileVersion` variable
- Made `users` collection write non-blocking (won't fail if it errors)
- Added auth token refresh before writes
- Added more detailed debugging logs

## Deployment Steps

### Option 1: Deploy via Firebase Console (Recommended)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database** → **Rules**
4. Copy the contents of `firestore.rules` file
5. Paste into the rules editor
6. Click **Publish**

### Option 2: Deploy via Firebase CLI
If you have `firebase.json` configured:
```bash
firebase deploy --only firestore:rules
```

## Testing
After deploying the rules:
1. Restart your local dev server
2. Try accepting terms again
3. Check the console logs for detailed debugging info

## Expected Behavior
- Profile should be saved to `profiles/{userId}`
- Users collection update should succeed (or fail silently if there's an issue)
- No permission errors

## Debugging
If you still get permission errors:
1. Check that the rules were deployed correctly in Firebase Console
2. Verify the user is authenticated (check console logs)
3. Verify the userId in the path matches `request.auth.uid`
4. Check that you're connecting to the correct Firebase project (not emulator)
