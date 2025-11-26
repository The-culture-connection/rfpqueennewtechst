# Fix for Opportunities API 404 Error

## The Problem

The API route `/api/opportunities` is returning a 404 error. This could be because:

1. **Firebase Storage bucket name mismatch**
2. **Files not in the correct path**
3. **API route not deployed correctly**

## Quick Fix Steps

### Step 1: Verify Firebase Storage Path

Your files should be in:
```
gs://therfpqueen-f11fd.firebasestorage.app/exports/
```

Make sure:
- ✅ Files are in the `exports/` folder (not root)
- ✅ Files have `.csv` or `.txt` extension
- ✅ Files are named with keywords: `grant`, `rfp`, `contract`, or `sam`

### Step 2: Check Environment Variables in Vercel

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Make sure these are set:
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` = `therfpqueen-f11fd.appspot.com` (or `therfpqueen-f11fd.firebasestorage.app`)
- `FIREBASE_PROJECT_ID` = `therfpqueen-f11fd`
- `FIREBASE_CLIENT_EMAIL` = (your service account email)
- `FIREBASE_PRIVATE_KEY` = (your private key)

### Step 3: Test the API Route

After deploying, test the API directly:
```
https://your-app.vercel.app/api/opportunities?limit=10
```

### Step 4: Check Deployment Logs

```bash
cd webapp
vercel logs [your-deployment-url]
```

Look for errors related to:
- Firebase Storage access
- Missing environment variables
- File listing errors

## Alternative: Fallback to Local Files

If Firebase Storage continues to have issues, we can add a fallback that checks local files first, then Firebase Storage.

## Debugging

Add this to see what's happening:

1. Check browser console for the exact error
2. Check Vercel function logs
3. Verify files exist in Firebase Storage console
4. Test the API route directly in browser

