# Vercel 404 Error - Fixes Applied

## ⚠️ CRITICAL: Check Build Output

**IMPORTANT:** After deploying, check the Vercel build logs and verify the route appears in the route list. Look for:

```
Route (app)                                 Size  First Load JS
...
├ ƒ /api/opportunities                    127 B         102 kB
```

✅ **If you see this line** → Route is included, should work
❌ **If this line is missing** → Route wasn't built (see troubleshooting below)

## Summary
Applied fixes to help diagnose and resolve the 404 error on the `/api/opportunities` route in Vercel.

## Changes Made

### 1. Enhanced API Route Logging (`src/app/api/opportunities/route.ts`)

#### Added Runtime Configuration
- Explicitly set `runtime = 'nodejs'` for Vercel serverless functions
- Set `dynamic = 'force-dynamic'` to ensure proper serverless function behavior

#### Verbose Request Logging
Added comprehensive logging at the very start of the route handler:
- Request URL
- Request Method
- Request Headers
- Environment variables (NODE_ENV, VERCEL_ENV)
- Timestamp

This will help determine if the route handler is even being called. If you don't see these logs in Vercel, the route isn't being hit.

#### Health Check Endpoint
Added a simple health check that returns immediately:
```
GET /api/opportunities?health=true
```

This will:
- Confirm the route is accessible
- Return quickly without processing Firebase/CSV data
- Help diagnose if it's a routing issue vs. processing issue

### 2. Improved Frontend Error Handling (`src/hooks/useOpportunities.ts`)

#### Enhanced Error Messages
- Better logging of response details (status, URL, headers)
- Specific error message for 404 errors explaining the route may not be deployed
- More detailed error context for debugging

#### Verified URL Format
- Confirmed the hook uses relative URL: `/api/opportunities` ✅
- No hard-coded localhost URLs found ✅

### 3. Route Structure Verification

✅ Route file is correctly placed at: `src/app/api/opportunities/route.ts`
✅ Route exports `GET` function correctly
✅ No conflicting routes or middleware found
✅ No vercel.json routing configuration conflicts

## How to Use These Fixes

### 1. Test the Health Check
After deploying, test the health check endpoint:
```
https://your-vercel-domain.vercel.app/api/opportunities?health=true
```

**Expected Response:**
```json
{
  "success": true,
  "status": "healthy",
  "route": "/api/opportunities",
  "timestamp": "2025-01-XX...",
  "environment": "production",
  "vercel": "production",
  "message": "API route is accessible"
}
```

**If you get 404 on health check:**
- Route is not being deployed
- Check Vercel build logs
- Verify file is in correct location: `src/app/api/opportunities/route.ts`

### 2. Check Vercel Logs

#### From Vercel Dashboard:
1. Go to your project on Vercel
2. Click **Deployments**
3. Click the deployment you're testing
4. Click **Logs** tab
5. Filter by: **Functions** or **Serverless**
6. Trigger a request (reload page or click button)
7. Look for logs starting with `[API]`

**What to look for:**
- If you see `[API] [timestamp] Opportunities route handler invoked` → Route is working, issue is in processing
- If you see nothing → Route is not being called, it's a routing/deployment issue

#### From CLI:
```bash
vercel logs https://your-deployment-domain.vercel.app --since 1h --source function
```

### 3. Local Testing with Vercel Environment

To test locally in a Vercel-like environment:

```bash
# Install Vercel CLI (if not already)
npm install -g vercel

# Run Vercel dev server
vercel dev
```

This uses your `next.config.ts` and serverless/edge runtime similar to Vercel.

### 4. Verify Build

Before deploying, build locally to catch issues:

```bash
npm run build
```

**Check for:**
- TypeScript errors
- Missing dependencies
- Route compilation errors

## Common Issues and Solutions

### Issue: Route Missing from Build Output
**Symptoms:** Route doesn't appear in Vercel build logs route list

**Possible causes:**
1. **Route file not committed/pushed**
   ```bash
   # Check if file is tracked
   git ls-files src/app/api/opportunities/route.ts
   
   # If empty, add and commit
   git add src/app/api/opportunities/route.ts
   git commit -m "Add opportunities API route"
   git push
   ```

2. **Deployment from old commit**
   - Check git log to see when route was added
   - Ensure latest code is pushed to main branch
   - Force a new deployment if needed

3. **Build error preventing route inclusion**
   - Check Vercel build logs for TypeScript errors
   - Run `npm run build` locally to catch errors
   - Fix any compilation errors

4. **File in wrong location**
   - ✅ Should be: `src/app/api/opportunities/route.ts`
   - ❌ NOT: `src/pages/api/opportunities.ts`
   - ❌ NOT: `src/app/api/opportunities.ts`

### Issue: 404 on Health Check
**Possible causes:**
1. Route not included in build (see above)
2. Build failing silently
   - Check Vercel build logs
   - Look for TypeScript errors

3. Route not exported correctly
   - Must export: `export async function GET(request: Request)`

### Issue: Health Check Works, But Full Request 404s
**Possible causes:**
1. Route times out before responding
2. Error in route handler prevents response
3. Check Vercel function logs for errors

### Issue: Route Works Locally but 404s on Vercel
**Possible causes:**
1. Environment variables missing
   - Check Vercel Dashboard → Settings → Environment Variables
   - Verify all Firebase vars are set

2. Wrong Vercel project
   - Verify you're testing the correct deployment URL
   - Check project name in Vercel dashboard

3. Build configuration issue
   - Check `next.config.ts`
   - Verify build output

## Next Steps

1. **Deploy these changes:**
   ```bash
   git add .
   git commit -m "Add verbose logging and health check to opportunities API route"
   git push
   ```

2. **Wait for Vercel deployment to complete**

3. **✅ VERIFY ROUTE IN BUILD OUTPUT (CRITICAL STEP):**
   - Go to Vercel Dashboard → Your Project → Latest Deployment
   - Scroll to build logs
   - Look for the "Route (app)" section
   - **Verify you see:** `├ ƒ /api/opportunities`
   - If missing, see "Issue: Route Missing from Build" below

4. **Test health check:**
   - Go to: `https://your-domain/api/opportunities?health=true`
   - Should return JSON response

5. **Check logs:**
   - Trigger a request from your app
   - Check Vercel logs for `[API]` entries

6. **If still 404:**
   - Verify route file location
   - Check build logs for errors
   - Confirm correct Vercel project/deployment

## Files Modified

1. `src/app/api/opportunities/route.ts`
   - Added runtime configuration
   - Added verbose logging
   - Added health check endpoint

2. `src/hooks/useOpportunities.ts`
   - Enhanced error messages
   - Better 404 error handling
   - More detailed response logging

## Additional Debugging Tips

### Check Request in Browser DevTools
1. Open DevTools → Network tab
2. Filter by "opportunities"
3. Click on the request
4. Check:
   - Request URL (should be relative: `/api/opportunities?...`)
   - Response status
   - Response body

### Verify Deployment
- Go to Vercel Dashboard → Your Project
- Click on latest deployment
- Check build logs for any errors
- Verify all environment variables are set

### Test Different Endpoints
- Health check: `/api/opportunities?health=true`
- Full request: `/api/opportunities?limit=10&fundingTypes=grants`

If health check works but full request doesn't, the issue is in the processing logic, not routing.

