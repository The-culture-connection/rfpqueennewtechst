# Render Environment Variables Setup

## Required Environment Variables

Set these in Render Dashboard → Your Service → Environment:

### Firebase Storage Bucket (IMPORTANT)
```
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=therfpqueen-f11fd.firebasestorage.app
```
**Note:** Do NOT include `gs://` prefix or `/exports` path - just the bucket name!

### Firebase Public Config
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=therfpqueen-f11fd.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=therfpqueen-f11fd
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Firebase Admin SDK (Server-side)
```
FIREBASE_PROJECT_ID=therfpqueen-f11fd
FIREBASE_CLIENT_EMAIL=your-service-account@therfpqueen-f11fd.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----"
```

### Optional
```
OPENAI_API_KEY=your_openai_key
```

## Important Notes

1. **Bucket Name Format:**
   - ✅ Correct: `therfpqueen-f11fd.firebasestorage.app`
   - ❌ Wrong: `gs://therfpqueen-f11fd.firebasestorage.app` (don't include gs://)
   - ❌ Wrong: `therfpqueen-f11fd.firebasestorage.app/exports` (don't include path)
   - ❌ Wrong: `therfpqueen-f11fd.appspot.com` (old format)

2. **Private Key Format:**
   - Must include `\n` for newlines
   - Must include BEGIN/END lines
   - Keep the quotes around the entire key

3. **After Setting Variables:**
   - Click "Save Changes"
   - Render will automatically redeploy
   - Check logs to verify bucket access

## Verify in Logs

After deployment, you should see in logs:
```
Accessing bucket: therpqueen-f11fd.firebasestorage.app, looking for files in exports/ folder
Found X total files in Firebase Storage exports/ folder
```

If you see "Found 0 files", check:
- Bucket name is correct
- Files are actually in `exports/` folder in Firebase Storage
- Service account has Storage permissions

