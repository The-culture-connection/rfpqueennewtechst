# Fix 404 Error - Deploy Updated Code

## The Problem

The API route `/api/opportunities` is returning 404 because the updated code hasn't been deployed yet.

## Solution: Redeploy

Run this command to deploy the updated code:

```bash
cd webapp
vercel --prod
```

## After Deployment

1. **Wait for deployment to complete** (usually 1-2 minutes)

2. **Test the API route:**
   ```
   https://bootybutt-4x17-the-culture-connections-projects.vercel.app/api/opportunities?limit=10
   ```

3. **Check the response:**
   - Should return JSON with opportunities
   - Or an error message with details

## If Still Getting 404

1. **Check deployment status:**
   ```bash
   vercel ls --prod
   ```

2. **Check if route is in build:**
   - Look for `/api/opportunities` in build output
   - Should show: `ƒ /api/opportunities`

3. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

4. **Check Vercel logs:**
   ```bash
   vercel logs [deployment-url]
   ```

## Quick Test

After deploying, you can test with different funding types:

- Grants only: `/api/opportunities?fundingTypes=grants&limit=10`
- RFPs only: `/api/opportunities?fundingTypes=rfps&limit=10`
- Contracts only: `/api/opportunities?fundingTypes=contracts&limit=10`
- All: `/api/opportunities?limit=10`

