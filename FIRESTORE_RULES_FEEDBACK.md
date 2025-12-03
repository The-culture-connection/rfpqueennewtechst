# Updated Firestore Rules for User Feedback

## Your Updated Rules

Copy and paste these rules into your Firebase Console (Firestore Database → Rules):

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // User profiles - requires authentication
    match /profiles/{userId} {
      // Users can read and write their own profile
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Dashboard progress tracking
      match /dashboard/progress {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Opportunity tracker (saved/applied)
      match /tracker/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // User uploaded documents metadata (nested under profile)
      match /documents/{documentId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Extracted document data (nested under profile) - DEPRECATED, kept for backward compatibility
      match /extractedData/{documentId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Profile fragments - AI-extracted data per document
      match /profileFragments/{documentId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Master business profile - merged from all fragments
      match /businessProfile/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // User Feedback collection - authenticated users can write their own feedback
    match /userFeedback/{feedbackId} {
      // Users can read all feedback (for admin purposes)
      allow read: if request.auth != null;
      
      // Users can create feedback with their own userId
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      
      // Users can only update/delete their own feedback
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## What Changed

Added the `User Feedback` collection rules:
- **Read**: Any authenticated user can read all feedback (useful for admin review)
- **Create**: Users can create feedback, but must include their own `userId` in the data
- **Update/Delete**: Users can only update or delete their own feedback (matching their `userId`)

## How to Deploy

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Rules**
4. Copy and paste the rules above
5. Click **Publish**

Or use Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

## Testing

After deploying, users should be able to:
- ✅ Submit feedback without permission errors
- ✅ Submit multiple feedback entries
- ✅ See their feedback submission count

