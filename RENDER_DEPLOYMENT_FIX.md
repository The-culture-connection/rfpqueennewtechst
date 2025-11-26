# Fix Opportunities Not Loading on Render

## The Problem

The API route is working but finding 0 files. The logs show:
```
Found 0 CSV/TXT files matching funding types: rfps
Total opportunities loaded: 0
```

## Root Cause

The bucket name or path might be incorrect. The correct path is:
```
gs://therfpqueen-f11fd.firebasestorage.app/exports
```

## Solution

### Step 1: Update Environment Variable in Render

1. Go to your Render dashboard
2. Select your service
3. Go to **Environment** tab
4. Find `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
5. Set it to: `therfpqueen-f11fd.firebasestorage.app` (without `gs://` prefix)
6. Click **Save Changes**

### Step 2: Verify All Environment Variables

Make sure these are set in Render:

- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` = `therfpqueen-f11fd.firebasestorage.app`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = `therfpqueen-f11fd`
- `FIREBASE_CLIENT_EMAIL` = (your service account email)
- `FIREBASE_PRIVATE_KEY` = (your private key with \n for newlines)
- `NEXT_PUBLIC_FIREBASE_API_KEY` = (your API key)
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` = `therfpqueen-f11fd.firebaseapp.com`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` = (your sender ID)
- `NEXT_PUBLIC_FIREBASE_APP_ID` = (your app ID)

### Step 3: Redeploy

After updating environment variables:
1. Go to Render dashboard
2. Click **Manual Deploy** → **Deploy latest commit**
3. Or push a new commit to trigger auto-deploy

### Step 4: Check Logs

After deployment, check the logs for:
- `Accessing bucket: therpqueen-f11fd.firebasestorage.app`
- `Found X total files in Firebase Storage exports/ folder`
- `Debug: First 10 file names: ...`

## Expected File Names

Your files should be:
- `exports/Govcontracts.csv` (contracts)
- `exports/RFP.csv` (rfps)
- `exports/grants.csv` (grants)
- `exports/grants2.csv` (grants)
- `exports/rfp2.csv` (rfps)
- `exports/rfp3.csv` (rfps)

## Debugging

If still not working, the logs will now show:
- Total files in bucket
- Sample file names
- Which path variations were tried

This will help identify if:
- Files are in a different location
- Bucket name is wrong
- Path prefix is wrong

