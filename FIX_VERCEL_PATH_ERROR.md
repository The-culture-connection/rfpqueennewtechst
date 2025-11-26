# Fix Vercel Routes-Manifest Error

## The Error

```
Error: The file "/vercel/path0/"C:\Users\grace\my-firebase-project\webapp"/routes-manifest.json" couldn't be found.
```

This error occurs because Vercel is looking for the build output in the wrong location.

## Solution: Clear Root Directory in Vercel Dashboard

1. **Go to Vercel Dashboard:**
   - https://vercel.com/the-culture-connections-projects/bootybutt-4x17/settings

2. **Go to Settings → General**

3. **Find "Root Directory" section**

4. **Click "Edit"**

5. **Clear the field completely** (leave it blank/empty)

6. **Click "Save"**

7. **Redeploy:**
   ```bash
   cd webapp
   vercel --prod
   ```

## Why This Happens

- Vercel has a root directory set that includes quotes or wrong path
- Next.js builds to `.next` folder in the project root
- Vercel needs to detect this automatically, not from a configured path

## Alternative: Check Project Settings

If clearing doesn't work:

1. In Vercel Dashboard → Settings → General
2. Check "Framework Preset" - should be "Next.js"
3. Check "Build Command" - should be empty (auto-detected)
4. Check "Output Directory" - should be empty (auto-detected)
5. Check "Install Command" - should be empty (auto-detected)

All of these should be auto-detected for Next.js projects.

## After Fixing

The deployment should complete successfully and you should see:
- ✅ Build completed
- ✅ All routes generated
- ✅ Deployment ready

