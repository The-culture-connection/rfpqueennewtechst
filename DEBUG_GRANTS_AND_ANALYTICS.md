# Debugging Grants Parsing and Analytics Issues

## Issue 1: Grants Not Loading (0 opportunities returned)

### Problem
- CSV files are being parsed successfully (323, 324, 99, 312, 324, 19 rows)
- But 0 opportunities are being returned
- This means opportunities are being filtered out during normalization

### Root Cause
The CSV column names in your grants files don't match what the code is looking for. The `normalizeOpportunity` function was only checking for a few column name variations.

### Fix Applied
I've updated `src/lib/csvParser.ts` to check for many more column name variations:
- Title: `Title`, `title`, `Opportunity Title`, `OpportunityTitle`, `Posting Title`, `Name`, etc.
- Description: `Description`, `Synopsis`, `Summary`, etc.
- Deadline: `Deadline`, `Close Date`, `Due Date`, `Application Due Date`, etc.
- Agency: `Agency`, `Department`, `Organization`, `Agency Name`, etc.

### Debug Logging Added
I've added detailed logging to `src/app/api/opportunities/route.ts` that will show:
- Column names from each CSV file
- How many opportunities were skipped and why (no title, past deadline, etc.)
- Sample row data for debugging

### What to Do
1. **Redeploy to Railway** (the updated code)
2. **Check Railway logs** after making a request to `/api/opportunities`
3. **Look for these new log messages:**
   ```
   [DEBUG] grants.csv - Column names (first 10): ...
   [DEBUG] grants.csv - Added: X, Skipped (no title): Y, Skipped (past deadline): Z
   ```

### If Still Not Working
The debug logs will tell us:
- What column names actually exist in your CSV files
- Why opportunities are being filtered out
- We can then update the normalization function to match your exact column names

---

## Issue 2: Analytics Not Initializing

### Problem
Analytics initialization logs are not appearing in the browser console.

### Possible Causes
1. **Environment variable not set in Railway**
   - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` must be set
   - Must be set for the correct environment (Production)

2. **Next.js build-time vs runtime**
   - `NEXT_PUBLIC_*` variables are embedded at **build time**
   - If you added the variable after building, you need to **rebuild/redeploy**

3. **Domain not authorized in Firebase**
   - Your Railway domain must be added to Firebase Authorized Domains
   - See `ANALYTICS_SETUP_FIREBASE.md` for instructions

### Fix Applied
I've created `AnalyticsInitializer` component that:
- Runs client-side only (after React hydration)
- Logs detailed debug information
- Shows exactly what's wrong if initialization fails

### What to Do

#### Step 1: Verify Environment Variable in Railway
1. Go to Railway Dashboard → Your Project → Variables
2. Check that `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` exists
3. Value should start with `G-` (e.g., `G-PWXR6YZMGH`)
4. Make sure it's set for **Production** environment

#### Step 2: Rebuild and Redeploy
**Important:** Since `NEXT_PUBLIC_*` vars are embedded at build time, you MUST rebuild:
```bash
# If deploying via Railway's Git integration, just push the code
# Railway will rebuild automatically

# Or if deploying manually, rebuild:
npm run build
# Then deploy
```

#### Step 3: Check Browser Console
After redeploying, open your Railway URL and check the browser console (F12). You should see:

**If working:**
```
[Analytics] 🔍 Checking initialization...
[Analytics] Measurement ID available: true
[Analytics] Measurement ID value: G-PWXR6YZM...
[Analytics] ✅ Initialized successfully with measurementId: G-PWXR6YZMGH
[Analytics] ✅ Successfully initialized!
```

**If not working:**
```
[Analytics] 🔍 Checking initialization...
[Analytics] Measurement ID available: false
[Analytics] Measurement ID value: MISSING
[Analytics] ❌ NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID is not set!
```

#### Step 4: Add Domain to Firebase (if needed)
If analytics still doesn't work after verifying the env var:
1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add your Railway domain: `web-production-9c20.up.railway.app`
3. Redeploy

---

## Quick Checklist

### For Grants Issue:
- [ ] Redeployed with updated code
- [ ] Check Railway logs for `[DEBUG]` messages
- [ ] Look for column name logs
- [ ] Check skip counts (no title, past deadline, etc.)

### For Analytics Issue:
- [ ] Verified `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` in Railway
- [ ] Value starts with `G-`
- [ ] Rebuilt/redeployed (important!)
- [ ] Checked browser console for analytics logs
- [ ] Added Railway domain to Firebase Authorized Domains

---

## Next Steps

After redeploying, check:
1. **Railway logs** - Look for the new `[DEBUG]` messages about grants
2. **Browser console** - Look for analytics initialization messages
3. **Share the logs** - If still not working, share the debug output so we can fix it

The debug logging will tell us exactly what's wrong with both issues!

