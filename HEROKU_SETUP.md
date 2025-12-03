# Heroku Setup Guide for Next.js App

## Files Created

I've created a `Procfile` which tells Heroku how to run your app. This is required for Heroku deployments.

## Quick Setup Steps

### 1. Make sure Procfile is committed
```bash
git add Procfile
git commit -m "Add Procfile for Heroku"
git push
```

### 2. Set Node.js Version (Important!)
Add this to your `package.json` in the "engines" field. I'll update it for you, but here's what it should look like:

```json
"engines": {
  "node": ">=18.0.0",
  "npm": ">=9.0.0"
}
```

### 3. Deploy to Heroku

**Option A: Via Heroku CLI**
```bash
# Install Heroku CLI if not already installed
# Download from: https://devcenter.heroku.com/articles/heroku-cli

# Login to Heroku
heroku login

# Create a new app (if not created yet)
heroku create your-app-name

# Set buildpacks
heroku buildpacks:set heroku/nodejs

# Push to Heroku
git push heroku main
```

**Option B: Via GitHub Integration**
1. Go to Heroku Dashboard
2. Create new app
3. Connect to your GitHub repository
4. Enable automatic deploys

### 4. Set Environment Variables

In Heroku Dashboard → Settings → Config Vars, add all your Firebase environment variables:

**Required Variables:**
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
OPENAI_API_KEY (optional)
```

### 5. Build and Start

Heroku will automatically:
1. Run `npm install`
2. Run `npm run build` (because of the build script)
3. Run `npm start` (from Procfile)

## Troubleshooting

### App Not Showing Up

**Check logs:**
```bash
heroku logs --tail
```

**Common issues:**
1. **Build failing** - Check build logs for errors
2. **Missing environment variables** - Set them in Heroku Dashboard
3. **Port binding issue** - Next.js handles this automatically, but check logs

### View Logs
```bash
heroku logs --tail
```

This will show real-time logs. Look for:
- Build errors
- Runtime errors
- Missing environment variables

### Restart the App
```bash
heroku restart
```

### Open App in Browser
```bash
heroku open
```

## Important Notes

1. **Next.js PORT**: Next.js automatically uses the `PORT` environment variable that Heroku provides. No configuration needed.

2. **Build Size**: Make sure your build isn't too large. Heroku has limits:
   - Slug size limit: 500MB (compressed)
   - Build timeout: 15 minutes (free tier) or 20 minutes (paid)

3. **Dyno Hours**: Free tier has limited dyno hours per month. If the app goes to sleep, it will wake up on first request (may take 30 seconds).

4. **Environment Variables**: All environment variables need to be set in Heroku Dashboard. They don't sync from your local `.env.local` file.

## Next Steps

1. ✅ Commit and push the Procfile
2. ✅ Set Node.js engine version (I'll update package.json)
3. ✅ Deploy to Heroku
4. ✅ Set environment variables
5. ✅ Check logs if issues occur

If you're seeing specific errors in the logs, share them and I can help debug!



