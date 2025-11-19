# 🔒 Firebase Storage Security Rules Setup

## Overview
Secure storage rules for user document uploads with maximum security.

---

## 🚀 Deploy Storage Rules

### Step 1: Access Firebase Console
1. Go to: https://console.firebase.google.com/
2. Select your project: **therfpqueen-f11fd**
3. Click **Storage** in the left sidebar
4. Click on the **Rules** tab

### Step 2: Copy the Rules
Copy these rules (also available in `firebase-storage-rules.txt`):

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // Profile data - existing rule
    match /profiles/{uid}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    
    // User documents - secure upload
    match /Userdocuments/{uid}/{allPaths=**} {
      // Only authenticated users can access their own documents
      allow read: if request.auth != null && request.auth.uid == uid;
      
      // Upload restrictions for maximum security
      allow write: if request.auth != null 
        && request.auth.uid == uid
        // File size limit: 50MB max
        && request.resource.size < 50 * 1024 * 1024
        // Only allow specific file types
        && (request.resource.contentType.matches('application/pdf')
          || request.resource.contentType.matches('application/msword')
          || request.resource.contentType.matches('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
          || request.resource.contentType.matches('image/jpeg')
          || request.resource.contentType.matches('image/jpg')
          || request.resource.contentType.matches('image/png'));
      
      // Allow deletion of own documents
      allow delete: if request.auth != null && request.auth.uid == uid;
    }
    
    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### Step 3: Publish the Rules
1. Paste the rules into the editor
2. Click **Publish** button
3. Confirm the deployment

---

## 🔐 Security Features

### ✅ Authentication Required
- **No anonymous access** - users must be logged in
- Each user can only access files in their own folder

### ✅ User Isolation
- **Path structure:** `Userdocuments/{uid}/`
- Users can NEVER access other users' documents
- Each UID is a separate, isolated folder

### ✅ File Size Limits
- **Maximum file size:** 50 MB
- Prevents abuse and excessive storage costs
- Protects against malicious large file uploads

### ✅ File Type Restrictions
**Allowed file types only:**
- PDFs: `application/pdf`
- Word Documents: `application/msword`, `.docx`
- Images: `image/jpeg`, `image/jpg`, `image/png`

**Blocked file types:**
- Executables (.exe, .bat, .sh)
- Scripts (.js, .py, .php)
- Archives (.zip, .rar, .tar)
- Any other file types

### ✅ Explicit Deny
- All other storage paths are explicitly denied
- Prevents accidental security holes

### ✅ Separate Permissions
- `read` - View own documents
- `write` - Upload new documents (with restrictions)
- `delete` - Remove own documents
- Each permission is separately controlled

---

## 📂 Storage Structure

### Your Storage Bucket
```
gs://therfpqueen-f11fd.firebasestorage.app/
├── profiles/
│   └── {uid}/                     # User profile data (existing)
│       └── ...
└── Userdocuments/                 # NEW: User documents
    ├── {user1_uid}/
    │   ├── sales-pitch-deck-123456789-Company.pdf
    │   ├── capability-statement-123456790-Services.pdf
    │   └── w9-123456791-W9_Form.pdf
    ├── {user2_uid}/
    │   ├── grant-proposal-123456792-Proposal.pdf
    │   └── impact-report-123456793-Impact.pdf
    └── {user3_uid}/
        └── ...
```

### File Naming Convention
Format: `{documentType}-{timestamp}-{originalFileName}`

Example:
```
Userdocuments/abc123def456/sales-pitch-deck-1700000000000-CompanyDeck.pdf
```

---

## 🧪 Testing the Rules

### Test 1: Upload as Authenticated User
```javascript
// Should SUCCEED
const user = auth.currentUser; // logged in
const ref = ref(storage, `Userdocuments/${user.uid}/test.pdf`);
await uploadBytes(ref, pdfFile); // ✅ Allowed
```

### Test 2: Try to Access Another User's File
```javascript
// Should FAIL
const user = auth.currentUser; // user ID: abc123
const ref = ref(storage, `Userdocuments/xyz789/test.pdf`); // different user
await getDownloadURL(ref); // ❌ Denied (Permission error)
```

### Test 3: Upload Non-Allowed File Type
```javascript
// Should FAIL
const ref = ref(storage, `Userdocuments/${user.uid}/script.js`);
await uploadBytes(ref, jsFile); // ❌ Denied (File type not allowed)
```

### Test 4: Upload File Too Large
```javascript
// Should FAIL
const ref = ref(storage, `Userdocuments/${user.uid}/huge.pdf`);
const file = new File([...], 'huge.pdf', { size: 60 * 1024 * 1024 }); // 60MB
await uploadBytes(ref, file); // ❌ Denied (Exceeds 50MB limit)
```

### Test 5: Anonymous Upload
```javascript
// Should FAIL
// Not logged in
const ref = ref(storage, `Userdocuments/someuid/test.pdf`);
await uploadBytes(ref, pdfFile); // ❌ Denied (No authentication)
```

---

## 🛡️ What's Protected

### ✅ Protected Against:
1. **Unauthorized access** - Users can't access others' documents
2. **Anonymous uploads** - Must be authenticated
3. **Malicious file types** - Only safe document types allowed
4. **Storage abuse** - 50MB file size limit per file
5. **Cost overruns** - File size limits prevent excessive storage costs
6. **Path traversal attacks** - Rules enforce strict path structure
7. **Injection attacks** - File type restrictions prevent script uploads

### ✅ Privacy Features:
- User documents are completely private
- No public access to any documents
- No cross-user visibility
- Audit trail via Firebase Storage logs

---

## 💰 Storage Costs with Security

### Free Tier (Spark Plan)
- **Storage:** 5 GB
- **Downloads:** 1 GB/day
- **Uploads:** 1 GB/day

### With 50MB File Limit:
- Max **100 documents per user** before hitting 5GB
- Prevents single user from exhausting storage
- Typical user: 10-15 documents (~500MB-750MB)

### Cost Protection:
The 50MB limit protects against:
- Accidental large file uploads
- Malicious storage abuse
- Unexpected cost spikes

---

## 🔧 Adjusting Security Settings

### Increase File Size Limit
```javascript
// Change this line:
&& request.resource.size < 50 * 1024 * 1024
// To (for 100MB):
&& request.resource.size < 100 * 1024 * 1024
```

### Add More File Types
```javascript
// Add after existing file types:
|| request.resource.contentType.matches('application/zip')
|| request.resource.contentType.matches('text/plain')
```

### Make Files Publicly Readable (NOT RECOMMENDED)
```javascript
// Replace read rule with:
allow read: if true; // ⚠️ WARNING: Makes all files public!
```

---

## 📊 Monitoring

### Check Storage Usage
1. Firebase Console → Storage
2. View **Usage** tab
3. Monitor storage consumption per user (via Storage logs)

### View Access Logs
1. Firebase Console → Storage → Usage and billing
2. Enable **Firebase Storage logs** in Google Cloud Console
3. Monitor unauthorized access attempts

### Set Up Alerts
1. Google Cloud Console → Monitoring
2. Create alert for storage usage > 80%
3. Create alert for unusual upload patterns

---

## ✅ Deployment Checklist

Before going live, verify:

- [ ] Rules deployed to Firebase Console
- [ ] Test uploads working for authenticated users
- [ ] Test uploads failing for wrong file types
- [ ] Test uploads failing for files >50MB
- [ ] Test cross-user access denied
- [ ] Test anonymous access denied
- [ ] Storage billing alerts configured
- [ ] Backup strategy in place

---

## 🆘 Troubleshooting

### "Permission denied" errors
**Cause:** User not authenticated or trying to access wrong path  
**Fix:** Ensure `user.uid` matches the path and user is logged in

### "File type not allowed" errors
**Cause:** Uploading unsupported file type  
**Fix:** Only upload PDF, DOC/DOCX, JPG, or PNG files

### "File too large" errors
**Cause:** File exceeds 50MB limit  
**Fix:** Compress file or split into smaller parts

### Rules not taking effect
**Cause:** Rules not published or cached  
**Fix:** Click "Publish" in console and wait 1-2 minutes

---

## 🎯 Summary

Your Firebase Storage is now **maximum security**:

✅ User-specific folders (`Userdocuments/{uid}/`)  
✅ Authentication required  
✅ 50MB file size limit  
✅ Restricted to safe file types only  
✅ No cross-user access  
✅ Delete own files capability  
✅ Explicit deny for all other paths  

**Your documents are now as secure as possible!** 🔒

