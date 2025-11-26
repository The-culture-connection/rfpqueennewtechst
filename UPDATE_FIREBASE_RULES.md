# Update Firebase Rules for Public Site Access

## What Changed

### Storage Rules
- **`/exports/` folder**: Changed from `allow read: if request.auth != null` to `allow read: if true`
- This allows **public read access** to CSV files in the exports folder
- All other folders remain secure (require authentication)

### Firestore Rules
- **No changes needed** - Firestore rules remain secure
- API routes use Firebase Admin SDK which bypasses rules
- User data remains protected

## How to Deploy

### Step 1: Update Storage Rules

1. Go to [Firebase Console](https://console.firebase.google.com/project/therfpqueen-f11fd/storage/rules)
2. Click **Edit rules**
3. Copy the contents of `firebase-storage-rules-public.txt`
4. Paste into the editor
5. Click **Publish**

### Step 2: Verify Firestore Rules

1. Go to [Firebase Console](https://console.firebase.google.com/project/therfpqueen-f11fd/firestore/rules)
2. Verify rules match `firebase-firestore-rules-public.txt`
3. If different, update and publish

## Security Notes

✅ **What's Public:**
- CSV files in `/exports/` folder (opportunity data)
- These are meant to be public data

🔒 **What's Still Secure:**
- User profiles (`/profiles/`)
- User documents (`/Userdocuments/`)
- All Firestore data (requires authentication)
- All other Storage paths

## Testing

After updating rules, test:

1. **Public access to exports:**
   ```
   https://firebasestorage.googleapis.com/v0/b/therfpqueen-f11fd.appspot.com/o/exports%2Fgrants.csv?alt=media
   ```
   Should work without authentication

2. **Your API route:**
   ```
   https://tacofrjgnt-4x17.dev/api/opportunities?limit=10
   ```
   Should now work correctly

## Important Notes

- The API route (`/api/opportunities`) uses **Firebase Admin SDK** which bypasses all security rules
- These rules are for **client-side access** (if your frontend accesses Firebase directly)
- Server-side API routes don't need rule changes, but public read access helps with debugging

## If Still Having Issues

If the API route still doesn't work after updating rules:

1. **Check Vercel environment variables:**
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

2. **Check Vercel logs:**
   ```bash
   vercel logs [deployment-url]
   ```

3. **Test API route directly:**
   ```
   https://tacofrjgnt-4x17.dev/api/opportunities?limit=10
   ```

