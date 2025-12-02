# 🚂 Deploy to Railway (Much Easier!)

## Why Railway?
- ✅ Handles large API routes better than Vercel
- ✅ No serverless function limits
- ✅ Simpler environment variable setup
- ✅ Better logging
- ✅ Free tier: $5 credit/month (enough for your app)
- ✅ Deploys in ~2 minutes

## Steps:

### 1. Go to Railway
Visit: https://railway.app

### 2. Sign Up / Log In
- Click "Start a New Project"
- Log in with GitHub

### 3. Deploy from GitHub
1. Click "Deploy from GitHub repo"
2. Select: `The-culture-connection/rfpqueennewtechst`
3. Click "Deploy Now"

### 4. Set Environment Variables
Railway will auto-detect Next.js. Now add your env vars:

1. Click on your project
2. Go to "Variables" tab
3. Click "Raw Editor"
4. Paste your `.env.local` contents:

```bash
# Copy from your .env.local file:
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
OPENAI_API_KEY=...
```

5. Click "Update Variables"

### 5. Redeploy
Railway will automatically redeploy with the new variables.

### 6. Get Your URL
- Go to "Settings" tab
- Under "Domains", click "Generate Domain"
- Your app will be live at: `your-app-name.up.railway.app`

---

## That's It! 🎉

No `vercel.json`, no serverless limits, no weird build issues.

---

## Check Build Logs
1. Click "Deployments"
2. Click latest deployment
3. Watch the build logs
4. Look for: `├ ƒ /api/opportunities` - it WILL be there!

---

## Alternative: Render.com

If Railway doesn't work, try Render:
1. Go to https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Settings:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
5. Add environment variables
6. Deploy!

Render free tier: slower but works great.


