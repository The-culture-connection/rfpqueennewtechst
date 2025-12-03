# Redeploy to Vercel - Quick Instructions

## ✅ Your Project is Already Linked!

Your project is already linked to Vercel, so you can deploy immediately.

## Step 1: Verify Environment Variables in Vercel

1. **Go to Vercel Dashboard:**
   - https://vercel.com/the-culture-connections-projects/bootybutt-4x17/settings/environment-variables

2. **Verify these are set** (add any that are missing):

### Critical Variables:
```
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=therfpqueen-f11fd.firebasestorage.app
FIREBASE_PROJECT_ID=therfpqueen-f11fd
FIREBASE_CLIENT_EMAIL=your-service-account@therfpqueen-f11fd.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----"
```

**Important:**
- Make sure `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` = `therfpqueen-f11fd.firebasestorage.app` (NOT `.appspot.com`)
- Set variables for **Production**, **Preview**, and **Development** environments
- `FIREBASE_PRIVATE_KEY` must include `\n` for newlines

## Step 2: Deploy to Vercel

Open terminal in the `webapp` folder and run:

```bash
cd webapp
vercel --prod
```

That's it! Vercel will:
- Build your app
- Deploy to production
- Show you the deployment URL

## Step 3: Test the API

After deployment completes, test:

```
https://bootybutt-4x17-the-culture-connections-projects.vercel.app/api/opportunities?limit=10
```

Or your custom domain:
```
https://tacofrjgnt-4x17.dev/api/opportunities?limit=10
```

## Step 4: Check Logs if Issues

If you get errors, check logs:

```bash
vercel logs [deployment-url]
```

Or in Vercel Dashboard:
- **Deployments** → Click latest → **View Function Logs**

## What to Expect

### ✅ Success:
- API returns JSON with opportunities
- No 502 errors
- Clear error messages if something is wrong

### ❌ If Error:
- You'll get a detailed error response (not 502)
- Error message will tell you exactly what's wrong
- Includes fix instructions

## Why Vercel is Better for This

- ✅ **Better memory limits** - Handles large CSV files better
- ✅ **Optimized for Next.js** - Serverless functions work perfectly
- ✅ **Automatic scaling** - No memory limit issues
- ✅ **Better error handling** - Your comprehensive error messages will work

## Quick Command Reference

```bash
# Deploy to production
vercel --prod

# View logs
vercel logs

# List deployments
vercel ls

# Check current project
vercel project ls
```

## After Deployment

Your app will be live at:
- Production: `https://bootybutt-4x17-the-culture-connections-projects.vercel.app`
- Custom domain: `https://tacofrjgnt-4x17.dev`

The comprehensive error messages will help identify any issues immediately!




