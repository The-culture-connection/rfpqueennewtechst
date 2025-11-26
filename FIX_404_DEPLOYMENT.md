# Fix for 404 Error on Vercel Deployment

## The Problem

You're getting a 404 error because Vercel is looking for the build output in the wrong location (`src/.next` instead of `.next` in the root).

## Solution: Configure Root Directory in Vercel Dashboard

Since your Next.js app is in the `webapp` subdirectory, you need to tell Vercel where the root is:

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/the-culture-connections-projects/bootybutt-4x17/settings
   - Or go to: vercel.com/dashboard → Your Project → Settings

2. **Set Root Directory:**
   - Go to **Settings** → **General**
   - Find **Root Directory**
   - Click **Edit**
   - Set it to: `webapp` (or leave blank if deploying from webapp folder)
   - Click **Save**

3. **Redeploy:**
   ```bash
   cd webapp
   vercel --prod
   ```

## Alternative: Deploy from Repository Root

If you're deploying from Git, make sure Vercel knows the root directory is `webapp`:

1. In Vercel Dashboard → Settings → General
2. Set **Root Directory** to `webapp`
3. This tells Vercel: "The Next.js app is in the `webapp` folder"

## Why This Happens

- Your project structure: `my-firebase-project/webapp/` (Next.js app is in subfolder)
- Vercel might be treating the parent directory as root
- Next.js builds `.next` in the same directory as `package.json`
- Vercel needs to know where `package.json` is located

## Quick Test

After setting the root directory, the deployment should:
- ✅ Find `package.json` in the right place
- ✅ Build `.next` in the correct location  
- ✅ Serve your app correctly

Try accessing your deployment URL again after this fix!

