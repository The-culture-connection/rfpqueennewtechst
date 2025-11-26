# Debug Firebase Storage Access

## Check Render Logs

After deployment, look for these log messages:

### Expected Logs (Success)
```
[DEBUG] Bucket name from env: therpqueen-f11fd.firebasestorage.app
[DEBUG] Using bucket: therpqueen-f11fd.firebasestorage.app
[DEBUG] Looking for files with prefix: exports/
[DEBUG] Found 6 total files in Firebase Storage exports/ folder
[DEBUG] File names: exports/Govcontracts.csv, exports/RFP.csv, exports/grants.csv, ...
```

### If Files Not Found
```
[DEBUG] Found 0 total files in Firebase Storage exports/ folder
No files found in exports/ folder, listing all files in bucket...
Total files in bucket: X
Sample file names: ...
```

## Common Issues

### Issue 1: Wrong Bucket Name in Env Var
**Check:** Look at the log `[DEBUG] Bucket name from env: ...`
- ✅ Should be: `therfpqueen-f11fd.firebasestorage.app`
- ❌ Wrong: `gs://therfpqueen-f11fd.firebasestorage.app` (has gs://)
- ❌ Wrong: `therfpqueen-f11fd.appspot.com` (old format)
- ❌ Wrong: `therfpqueen-f11fd.firebasestorage.app/exports` (has path)

**Fix:** Update the env var in Render to just: `therfpqueen-f11fd.firebasestorage.app`

### Issue 2: Files Not in exports/ Folder
**Check:** Look at `Sample file names: ...` in logs
- If files are at root: `Govcontracts.csv` (no exports/ prefix)
- If files are in exports: `exports/Govcontracts.csv`

**Fix:** Make sure files are uploaded to `exports/` folder in Firebase Storage

### Issue 3: Service Account Permissions
**Check:** Look for error messages about permissions
- Error: "Permission denied" or "Access denied"

**Fix:** 
1. Go to Firebase Console → IAM & Admin → Service Accounts
2. Find your service account
3. Make sure it has "Storage Admin" or "Storage Object Admin" role

### Issue 4: Wrong Project ID
**Check:** Verify `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = `therfpqueen-f11fd`

## Verify Files in Firebase Storage

1. Go to [Firebase Console → Storage](https://console.firebase.google.com/project/therfpqueen-f11fd/storage)
2. Check if files are in `exports/` folder
3. File names should be:
   - `exports/Govcontracts.csv`
   - `exports/RFP.csv`
   - `exports/grants.csv`
   - `exports/grants2.csv`
   - `exports/rfp2.csv`
   - `exports/rfp3.csv`

## Test After Fix

After fixing the issue, the API should return opportunities:
```
GET https://your-render-url.onrender.com/api/opportunities?limit=10
```

Should return JSON with opportunities array.

