# 🚂 Railway Deployment Checklist

Use this checklist to deploy your app to Railway with optimal memory settings.

---

## ✅ Pre-Deployment Checklist

### 1. **Code Changes (DONE ✅)**
- [x] Updated `package.json` with memory-optimized start script
- [x] Updated `Procfile` to use `npm run start:prod`
- [x] Created `railway.json` configuration
- [x] Optimized API routes for memory efficiency
- [x] Added file size limits (10MB max)
- [x] Reduced default record limit (1000 records)

### 2. **Commit and Push Changes**
```bash
git add .
git commit -m "fix: optimize memory usage for Railway"
git push origin main
```

---

## 🚀 Railway Setup

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up / Log in with GitHub
3. Connect your GitHub repository

### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository: `The-culture-connection/rfpqueennewtechst`
4. Railway will auto-detect Next.js

### Step 3: Configure Environment Variables

**Method 1: Raw Editor (Fastest)**
1. Click on your project
2. Go to "Variables" tab
3. Click "Raw Editor"
4. Copy from `.env.railway` file
5. Fill in your actual values
6. Click "Update Variables"

**Method 2: One by One**
1. Click on your project
2. Go to "Variables" tab
3. Click "+ New Variable"
4. Add each variable from `.env.railway`

**Critical Variables:**
```bash
# Memory Settings (REQUIRED)
NODE_OPTIONS=--max-old-space-size=1024 --optimize-for-size --gc-interval=100

# Firebase (All Required)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# OpenAI (Required for document extraction)
OPENAI_API_KEY=sk-...
```

### Step 4: Deploy
1. Railway will automatically build and deploy
2. Wait 3-5 minutes for build to complete
3. Check logs: Deployments → View Logs

### Step 5: Get Your URL
1. Go to "Settings" tab
2. Under "Domains", click "Generate Domain"
3. Your app URL: `your-app-name.up.railway.app`

---

## 📊 Verify Deployment

### 1. Check Health
Visit: `https://your-app-name.up.railway.app/api/healthcheck`

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-02T..."
}
```

### 2. Check Opportunities API
Visit: `https://your-app-name.up.railway.app/api/opportunities?health=true`

**Expected response:**
```json
{
  "success": true,
  "status": "healthy",
  "route": "/api/opportunities"
}
```

### 3. Check Main App
Visit: `https://your-app-name.up.railway.app`

Should show your login page.

---

## 🔍 Monitor Memory Usage

### Railway Dashboard
1. Click on your service
2. View "Metrics" tab
3. Monitor:
   - **Memory Usage** (should stay under 1GB)
   - **CPU Usage**
   - **Network I/O**

### Check Logs
```
Deployments → Latest Deployment → View Logs
```

**Good signs:**
```
✓ Ready in 3.2s
[API] Processing file: grants.csv
[API] Parsed 250 rows
✅ Successfully loaded 1000 opportunities
```

**Bad signs (memory issues):**
```
JavaScript heap out of memory
FATAL ERROR: Reached heap limit
Process exited with code 137 (out of memory)
```

---

## ⚠️ Troubleshooting

### Issue 1: "JavaScript heap out of memory"

**Cause:** App is using more memory than allocated (1GB)

**Solutions:**
1. **Check if CSV files are too large:**
   - Go to Firebase Storage → exports folder
   - Files should be under 5MB each
   - Split large files using: `Opportunities/split_files_2to5.py`

2. **Reduce record limit:**
   - Update `src/hooks/useOpportunities.ts`: change limit to 500
   - Or upgrade Railway plan

3. **Upgrade Railway plan:**
   - Free: 512MB RAM
   - Hobby ($5/mo): 8GB RAM

### Issue 2: Build Fails

**Cause:** Build process running out of memory

**Solutions:**
1. Check Railway build logs
2. Verify all environment variables are set
3. Try rebuilding: Deployments → Redeploy

### Issue 3: App Slow to Respond

**Cause:** Memory optimizations trade speed for stability

**Solutions:**
1. Remove `--optimize-for-size` from `NODE_OPTIONS`
2. Increase memory: `--max-old-space-size=2048`
3. Requires Railway Hobby plan for more RAM

### Issue 4: "Missing Environment Variables"

**Cause:** Environment variables not set in Railway

**Solutions:**
1. Go to Variables tab
2. Verify all variables from `.env.railway` are present
3. Check for typos in variable names
4. Redeploy after adding variables

### Issue 5: 502 Bad Gateway

**Cause:** App crashed or not responding

**Solutions:**
1. Check logs for crash reason
2. Restart: Settings → Restart
3. Verify `Procfile` uses: `web: npm run start:prod`

---

## 💡 Performance Tips

### 1. **Implement Pagination** (Recommended)
Instead of loading 1000 records at once:
- Load 50-100 records per page
- Add "Load More" button
- Reduces memory and improves UX

### 2. **Lazy Load Documents**
For document extraction:
- Process one document at a time
- Show progress indicator
- Don't upload multiple large files simultaneously

### 3. **Optimize CSV Files**
- Keep CSV files under 5MB
- Remove unnecessary columns
- Use the Python splitter: `Opportunities/split_files_2to5.py`

### 4. **Monitor Usage**
Railway free tier: $5 credit/month
- Check usage: Dashboard → Usage
- Set up alerts
- Upgrade before hitting limit

---

## 📈 Expected Performance

After optimization:

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Memory Usage | ~1.5GB | ~600MB | <1GB |
| Opportunities Loaded | 5000 | 1000 | 1000 |
| Max File Size | Unlimited | 10MB | 10MB |
| Startup Time | ~5-10s | ~3-5s | <5s |
| API Response | ~5-10s | ~2-5s | <5s |

---

## 🎯 Success Criteria

Your deployment is successful when:

- [x] App loads without errors
- [x] Login/signup works
- [x] Dashboard shows opportunities
- [x] Document upload works (files < 10MB)
- [x] Profile editing works
- [x] Memory stays under 1GB
- [x] No crashes for 24 hours

---

## 🆘 Still Having Issues?

### Option 1: Upgrade Railway Plan
**Hobby Plan ($5/month):**
- 8GB RAM (8x more)
- 8 vCPU
- No sleep
- Better support

### Option 2: Alternative Platforms

If Railway doesn't work, try:

1. **Render.com**
   - Free tier: 512MB RAM
   - More stable for Node apps
   - Easier environment setup

2. **Fly.io**
   - Free tier: 256MB RAM (3 machines)
   - Better memory management
   - Global edge network

3. **DigitalOcean App Platform**
   - $5/month: 1GB RAM
   - More predictable performance
   - Better documentation

4. **Vercel (Original)**
   - Serverless (no memory issues)
   - But has function size limits
   - Best for smaller APIs

---

## 📞 Support

**Railway Docs:** https://docs.railway.app  
**Railway Discord:** https://discord.gg/railway  
**Firebase Status:** https://status.firebase.google.com

---

## ✅ Final Checklist

Before marking as complete:

- [ ] Code pushed to GitHub
- [ ] Railway project created
- [ ] All environment variables set
- [ ] App deployed successfully
- [ ] Health check passes
- [ ] Opportunities API works
- [ ] Login/signup tested
- [ ] Dashboard loads
- [ ] Memory usage monitored (< 1GB)
- [ ] No errors in logs
- [ ] Custom domain set (optional)

---

**Deployment Date:** _______________  
**Railway URL:** _______________  
**Memory Usage:** _______________  
**Status:** _______________




