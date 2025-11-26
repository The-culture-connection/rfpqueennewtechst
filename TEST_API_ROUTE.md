# Test Your API Route

## Quick Test

After deploying, test the API route directly in your browser:

```
https://your-app.vercel.app/api/opportunities?limit=10
```

This should return JSON with opportunities or an error message.

## Expected File Matching

Based on your files:
- `Govcontracts.csv` → Should match "contracts" (contains "contract")
- `RFP.csv` → Should match "rfps" (contains "rfp")
- `grants.csv` → Should match "grants" (contains "grant")
- `grants2.csv` → Should match "grants" (contains "grant")
- `rfp2.csv` → Should match "rfps" (contains "rfp")
- `rfp3.csv` → Should match "rfps" (contains "rfp")

## Debugging Steps

1. **Test API directly:**
   ```
   https://your-app.vercel.app/api/opportunities?limit=10&fundingTypes=grants
   ```

2. **Check Vercel logs:**
   ```bash
   cd webapp
   vercel logs [deployment-url]
   ```

3. **Check browser console:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Look for `/api/opportunities` request
   - Check the response

4. **Verify Firebase Storage:**
   - Go to Firebase Console → Storage
   - Verify files are in `exports/` folder
   - Check file names match exactly

## Common Issues

### Issue 1: 404 Error
- **Cause:** API route not deployed or not found
- **Fix:** Redeploy with `vercel --prod`

### Issue 2: No Files Found
- **Cause:** Files not in `exports/` folder or wrong bucket
- **Fix:** Check Firebase Storage console, verify path

### Issue 3: Permission Error
- **Cause:** Firebase Admin credentials not set
- **Fix:** Check Vercel environment variables

### Issue 4: Files Not Matching
- **Cause:** Filename doesn't contain expected keywords
- **Fix:** Check file names match: grant, rfp, contract

