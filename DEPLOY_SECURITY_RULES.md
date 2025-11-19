# 🔒 Deploy Firebase Security Rules

## ⚠️ IMPORTANT: Deploy BOTH Storage AND Firestore Rules

You need to deploy rules for **TWO** Firebase services:
1. **Storage Rules** (for file uploads)
2. **Firestore Rules** (for metadata/database)

---

## 🚀 Step 1: Deploy Firestore Rules (CRITICAL!)

### Access Firestore Rules
1. Go to: https://console.firebase.google.com/project/therfpqueen-f11fd/firestore/rules
2. Or: Firebase Console → Firestore Database → Rules tab

### Copy Firestore Rules
Copy from `firebase-firestore-rules.txt` or below:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // User profiles
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /dashboard/progress {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /tracker/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // User uploaded documents metadata
    match /documents/{documentId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      
      allow create: if request.auth != null 
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.keys().hasAll(['userId', 'documentType', 'fileName', 'uploadedAt']);
      
      allow update: if request.auth != null && resource.data.userId == request.auth.uid;
      allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // Extracted document data
    match /extractedData/{documentId} {
      allow read: if request.auth != null 
        && exists(/databases/$(database)/documents/documents/$(documentId))
        && get(/databases/$(database)/documents/documents/$(documentId)).data.userId == request.auth.uid;
      
      allow write: if request.auth != null;
    }
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Publish Firestore Rules
1. Paste rules into the editor
2. Click **"Publish"** button
3. Wait for confirmation

---

## 🚀 Step 2: Deploy Storage Rules

### Access Storage Rules
1. Go to: https://console.firebase.google.com/project/therfpqueen-f11fd/storage/rules
2. Or: Firebase Console → Storage → Rules tab

### Copy Storage Rules
Copy from `firebase-storage-rules.txt` or below:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // Profile data
    match /profiles/{uid}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    
    // User documents
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
    
    // Scraped data exports - read-only for authenticated users
    match /exports/{allPaths=**} {
      // Any authenticated user can download exported CSV files
      allow read: if request.auth != null;
      
      // Only Cloud Functions can write (no user write access)
      allow write: if false;
    }
    
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### Publish Storage Rules
1. Paste rules into the editor
2. Click **"Publish"** button
3. Wait for confirmation

---

## ✅ Verification Checklist

After deploying BOTH sets of rules:

- [ ] Firestore rules published (green checkmark in console)
- [ ] Storage rules published (green checkmark in console)
- [ ] Refresh your app (Ctrl+Shift+R)
- [ ] Try uploading a document
- [ ] Check for "Missing permissions" error (should be gone!)
- [ ] Verify document appears in Documents page
- [ ] Check Firestore console for new entry in `documents` collection

---

## 🧪 Test the Deployment

### Test 1: Upload a Document
```
1. Go to /documents page
2. Click "Upload" on any document type
3. Select a PDF file
4. ✅ Should upload successfully
5. ✅ Should see progress bar
6. ✅ Should show "Pending" status
```

### Test 2: Check Firestore
```
1. Firebase Console → Firestore Database → Data tab
2. Look for "documents" collection
3. ✅ Should see your uploaded document metadata
4. ✅ Check userId field matches your user ID
```

### Test 3: Check Storage
```
1. Firebase Console → Storage → Files tab
2. Navigate to: Userdocuments/{your-uid}/
3. ✅ Should see your uploaded file
4. ✅ Click on it to verify it's readable
```

---

## 🆘 Troubleshooting

### Error: "Missing or insufficient permissions"

**Still getting this error after deploying?**

1. **Clear browser cache:**
   - Press Ctrl+Shift+Delete
   - Clear cached data
   - Refresh page (Ctrl+Shift+R)

2. **Wait 1-2 minutes:**
   - Firebase rules take time to propagate
   - Try again after waiting

3. **Check both rules deployed:**
   - Firestore rules: ✅
   - Storage rules: ✅

4. **Verify you're logged in:**
   - Check if `user` is authenticated
   - Try logging out and back in

5. **Check browser console:**
   ```javascript
   // Press F12, go to Console tab
   // Look for specific error messages
   // Should show which rule failed
   ```

### Error: "Permission denied" on specific operation

**Check which operation failed:**

- **Upload failing:** Storage rules issue
- **Saving metadata failing:** Firestore rules issue
- **Reading documents failing:** Check userId matches

### Rules not taking effect

1. **Refresh Firebase Console**
2. **Check Rules tab shows "Published"** (green indicator)
3. **Wait 60 seconds** for propagation
4. **Hard refresh your app** (Ctrl+Shift+R)

---

## 📊 What Each Rule Does

### Firestore Rules
- **Profiles:** User profile data (onboarding info, preferences)
- **Dashboard progress:** Where user left off reviewing opportunities
- **Tracker:** Saved and applied opportunities
- **Documents:** Metadata about uploaded files (filename, type, status)
- **ExtractedData:** Extracted text from documents (Phase 2)

### Storage Rules
- **Profiles:** User profile images/data files
- **Userdocuments:** Uploaded business documents (PDFs, images, etc.)

---

## 🔐 Security Features Enabled

After deploying both rules:

✅ User isolation (can't access others' data)
✅ Authentication required
✅ File type restrictions (Storage)
✅ File size limits (Storage)
✅ Required field validation (Firestore)
✅ Owner-based access control
✅ Explicit deny for unmatched paths

---

## 📝 Quick Reference

### Firestore Rules Location
```
Firebase Console → Firestore Database → Rules
https://console.firebase.google.com/project/therfpqueen-f11fd/firestore/rules
```

### Storage Rules Location
```
Firebase Console → Storage → Rules
https://console.firebase.google.com/project/therfpqueen-f11fd/storage/rules
```

### Files to Reference
- `firebase-firestore-rules.txt` - Firestore rules
- `firebase-storage-rules.txt` - Storage rules
- `FIREBASE_STORAGE_SECURITY_SETUP.md` - Detailed guide

---

## ✅ Success Indicators

You'll know it worked when:

1. ✅ No "permission denied" errors in console
2. ✅ Documents upload successfully
3. ✅ Progress bar appears and completes
4. ✅ Document shows "Pending" → "Processing" status
5. ✅ Document appears in Firestore `documents` collection
6. ✅ File appears in Storage `Userdocuments/{uid}/` folder

---

## 🎯 Summary

**Deploy in this order:**

1. ✅ **Firestore Rules FIRST** (fixes "Missing permissions" error)
2. ✅ **Storage Rules SECOND** (enables secure uploads)
3. ✅ Wait 1-2 minutes
4. ✅ Hard refresh your app
5. ✅ Test document upload

**Both rules are required for the document system to work!**

---

Need help? Check the browser console (F12) for specific error messages and refer to the troubleshooting section above.

