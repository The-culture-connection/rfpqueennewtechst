# Fix 502 Bad Gateway Error

## What 502 Means

A 502 error means the API route is crashing or timing out before it can return a response. This is usually caused by:

1. **Unhandled exception** - Code is throwing an error that's not caught
2. **Firebase Admin SDK initialization failure** - Missing or invalid credentials
3. **Timeout** - Request taking too long (Render has timeout limits)
4. **Memory issues** - Processing too much data at once

## Check Render Logs

Look for error messages in Render logs. You should see:
- `[API] Opportunities route called` - Route is being hit
- `[API] Environment variables check:` - Shows which env vars are set
- `[ERROR]` messages - Shows what's failing

## Common Causes

### 1. Missing Environment Variables

Check Render Dashboard → Environment tab. Make sure ALL are set:
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`

### 2. Invalid Private Key Format

The `FIREBASE_PRIVATE_KEY` must:
- Include `\n` for newlines (literal backslash-n, not actual newlines)
- Include BEGIN/END lines
- Be wrapped in quotes

Example:
```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----"
```

### 3. Firebase Admin SDK Initialization Error

If you see errors about "Missing Firebase Admin credentials" or "Invalid credential", check:
- All env vars are set correctly
- Private key format is correct
- Service account email matches the private key

### 4. Timeout (Large Files)

If processing large CSV files (like Govcontracts.csv at 183MB), the request might timeout.

**Solution:** Process files in smaller chunks or increase timeout.

## Debugging Steps

1. **Check Render Logs:**
   - Go to Render Dashboard → Your Service → Logs
   - Look for `[ERROR]` or `[API]` messages
   - Check for stack traces

2. **Test API Route Directly:**
   ```
   https://rfpqueennewtechst.onrender.com/api/opportunities?limit=10
   ```
   Should return JSON (even if empty) or an error message, not 502

3. **Check Environment Variables:**
   - Verify all are set in Render
   - Check for typos
   - Verify private key format

4. **Reduce Limit:**
   Try with a smaller limit first:
   ```
   /api/opportunities?limit=10
   ```

## Quick Fixes

### Fix 1: Add Timeout Protection
If files are too large, process them in batches.

### Fix 2: Verify Credentials
Double-check all Firebase credentials are correct in Render.

### Fix 3: Check Service Account Permissions
Make sure the service account has "Storage Admin" role in Firebase.

## After Fixing

The route should return:
- ✅ `200 OK` with opportunities data
- ✅ `500` with error message (better than 502)
- ❌ `502` (means route is crashing)

