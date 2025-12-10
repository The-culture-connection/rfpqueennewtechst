# 🔒 Updated Firebase Security Rules

## ⚠️ Important: Two Types of Rules Needed

You need to update **BOTH** Storage and Firestore rules to fix the permission errors.

---

## 📋 Step 1: Update Firestore Rules (For Cache)

The opportunity cache is stored in Firestore at `profiles/{userId}/cache/opportunities`.

### Access Firestore Rules
1. Go to: https://console.firebase.google.com/project/therfpqueen-f11fd/firestore/rules
2. Or: Firebase Console → Firestore Database → Rules tab

### Copy These Rules

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
      
      // Dashboard passed opportunities
      match /dashboard/passed {
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
      
      // User preferences for learning
      match /preferences/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // ⭐ NEW: Opportunity cache - allows users to read/write their cached opportunities
      match /cache/opportunities {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // User Feedback collection - authenticated users can write their own feedback
    match /userFeedback/{feedbackId} {
      // Users can read all feedback (for admin purposes)
      allow read: if request.auth != null;
      
      // Users can create feedback with their own userId
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid &&
                       request.resource.data.userEmail == request.auth.token.email;
      
      // Users can only update/delete their own feedback
      allow update, delete: if request.auth != null && 
                               resource.data.userId == request.auth.uid;
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Publish
1. Paste the rules above
2. Click **"Publish"**
3. Wait for confirmation

---

## 📦 Step 2: Update Storage Rules (For SAM.gov CSV)

The SAM.gov CSV file is in Storage at `exports/ContractOpportunitiesFullCSV.csv`.

### Access Storage Rules
1. Go to: https://console.firebase.google.com/project/therfpqueen-f11fd/storage/rules
2. Or: Firebase Console → Storage → Rules tab

### Copy These Rules

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // ⭐ Public read access for exported CSV files (for public website and Admin SDK)
    // This allows the public site and server-side code to read opportunity data
    match /exports/{allPaths=**} {
      // Allow public read access (no authentication required)
      // This is safe because exports are public data
      allow read: if true;
      
      // Only Cloud Functions/Admin SDK can write (no user write access)
      allow write: if false;
    }
    
    // Profile data - requires authentication
    match /profiles/{uid}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    
    // User documents - requires authentication
    match /Userdocuments/{uid}/{allPaths=**} {
      allow read: if request.auth != null && request.auth.uid == uid;
      
      allow write: if request.auth != null 
        && request.auth.uid == uid
        && request.resource.size < 50 * 1024 * 1024
        && (request.resource.contentType.matches('application/pdf')
          || request.resource.contentType.matches('application/msword')
          || request.resource.contentType.matches('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
          || request.resource.contentType.matches('image/jpeg')
          || request.resource.contentType.matches('image/jpg')
          || request.resource.contentType.matches('image/png'));
      
      allow delete: if request.auth != null && request.auth.uid == uid;
    }
    
    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### Publish
1. Paste the rules above
2. Click **"Publish"**
3. Wait for confirmation

---

## ⚠️ Important Note About Admin SDK

**The Firebase Admin SDK bypasses Storage rules** and uses IAM permissions instead.

If you're still getting permission errors for the SAM.gov CSV file when using the Admin SDK, you need to:

### Grant IAM Permissions (For Admin SDK)

1. Go to: https://console.cloud.google.com/iam-admin/iam
2. Select your project: **therfpqueen-f11fd**
3. Find your service account (the email from `FIREBASE_CLIENT_EMAIL` in your `.env.local`)
4. Click the **Edit** (pencil) icon
5. Click **"ADD ANOTHER ROLE"**
6. Add one of these roles:
   - **Storage Object Viewer** (read-only access)
   - **Storage Admin** (full access - use if you need to write files)
7. Click **"SAVE"**
8. Wait 1-2 minutes for permissions to propagate

---

## ✅ What These Rules Enable

### Firestore Rules
- ✅ Users can read/write their own opportunity cache
- ✅ Users can access their profile data
- ✅ Users can track dashboard progress
- ✅ Users can manage their documents

### Storage Rules
- ✅ Public read access to `/exports/` folder (for SAM.gov CSV)
- ✅ Authenticated users can upload their own documents
- ✅ File type and size restrictions enforced

---

## 🧪 Test After Deployment

1. **Wait 1-2 minutes** after publishing rules
2. **Hard refresh** your browser (Ctrl+Shift+R or Cmd+Shift+R)
3. **Check console** for permission errors
4. **Test dashboard** - opportunities should load from cache
5. **Test SAM.gov CSV** - should load without errors

---

## 📝 Summary

**Deploy in this order:**
1. ✅ **Firestore Rules FIRST** (adds cache path)
2. ✅ **Storage Rules SECOND** (ensures exports are readable)
3. ✅ **IAM Permissions** (if Admin SDK still has issues)
4. ✅ Wait 1-2 minutes
5. ✅ Test the app

The key changes:
- Added `/cache/opportunities` path to Firestore rules
- Ensured `/exports/` has public read access in Storage rules
- Both rules maintain security (users can only access their own data)


