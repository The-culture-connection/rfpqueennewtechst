# Redeploy to Vercel - Step by Step

## Why Switch Back to Vercel

- ✅ Better memory limits for Next.js apps
- ✅ Optimized for Next.js serverless functions
- ✅ Automatic scaling
- ✅ Better error handling

## Step 1: Verify Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `bootybutt-4x17`
3. Go to **Settings** → **Environment Variables**
4. Verify these are set (add if missing):

### Required Variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=therfpqueen-f11fd.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=therfpqueen-f11fd
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=therfpqueen-f11fd.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
FIREBASE_PROJECT_ID=therfpqueen-f11fd
FIREBASE_CLIENT_EMAIL=your-service-account@therfpqueen-f11fd.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----"
```

**Important:**
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` should be: `therfpqueen-f11fd.firebasestorage.app` (NOT `.appspot.com`)
- `FIREBASE_PRIVATE_KEY` must include `\n` for newlines
- Make sure variables are set for **Production**, **Preview**, and **Development**

## Step 2: Deploy to Vercel

### Option A: Deploy via CLI (Recommended)

```bash
cd webapp
vercel --prod
```

### Option B: Deploy via Git (Automatic)

If your repo is connected to Vercel:
```bash
git add .
git commit -m "Add comprehensive error handling for opportunities API"
git push origin main
```

Vercel will automatically deploy.

## Step 3: Verify Deployment

1. Wait for deployment to complete (1-2 minutes)
2. Check deployment URL (shown in terminal or Vercel dashboard)
3. Test the API route:
   ```
   https://your-app.vercel.app/api/opportunities?limit=10
   ```

## Step 4: Check Logs

If you get errors, check Vercel logs:

```bash
vercel logs [deployment-url]
```

Or in Vercel Dashboard:
- Go to your project → **Deployments** → Click on latest deployment → **View Function Logs**

## Expected Behavior

### Success Response:
```json
{
  "success": true,
  "count": 150,
  "opportunities": [...],
  "hasMore": false
}
```

### Error Response (instead of 502):
```json
{
  "success": false,
  "error": "Firebase Storage Permission Denied",
  "details": "The service account does not have permission...",
  "fix": "Go to Firebase Console → IAM & Admin...",
  "type": "Error",
  "code": 7
}
```

## Troubleshooting

### If you get 502 error:
1. Check Vercel function logs
2. Look for `[ERROR]` messages
3. The error response will tell you exactly what's wrong

### If files not found:
- Check logs for `[DEBUG]` messages
- Verify bucket name is correct
- Verify files are in `exports/` folder in Firebase Storage

### If memory issues:
- Vercel has better memory limits than Render
- If still issues, reduce the `limit` parameter
- Process files one at a time

## Quick Deploy Command

```bash
cd webapp
vercel --prod
```

That's it! The comprehensive error messages will help identify any issues.


