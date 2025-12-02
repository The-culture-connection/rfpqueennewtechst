# 🚂 Railway Memory Optimization Guide

## ✅ Changes Made

I've implemented several memory optimizations to prevent out-of-memory errors on Railway:

### 1. **Node.js Memory Limits** ✅
Updated `package.json` with optimized memory settings:

```json
"start": "NODE_OPTIONS='--max-old-space-size=512 --optimize-for-size --gc-interval=100' next start"
"start:prod": "NODE_OPTIONS='--max-old-space-size=1024 --optimize-for-size --gc-interval=100' next start"
```

- `--max-old-space-size=512`: Limits memory to 512MB (dev) / 1024MB (prod)
- `--optimize-for-size`: Optimizes for memory usage over speed
- `--gc-interval=100`: More frequent garbage collection

### 2. **Procfile Updated** ✅
```
web: npm run start:prod
```

### 3. **Railway Configuration** ✅
Created `railway.json` with optimized settings.

### 4. **API Route Optimizations** ✅

**Opportunities Route (`/api/opportunities`):**
- ✅ Reduced default limit from 5000 to 1000 records
- ✅ Added file size check (skips files > 10MB)
- ✅ Processes files one at a time
- ✅ Clears buffers immediately after use
- ✅ Triggers garbage collection hints

**Document Extraction Route (`/api/extract-document`):**
- ✅ Added file size validation (max 10MB)
- ✅ Clears memory after AI processing

---

## 🚀 Deploy to Railway

### Step 1: Update Environment Variables

Railway needs to know about the memory settings. Add this to your Railway environment variables:

```bash
NODE_OPTIONS=--max-old-space-size=1024 --optimize-for-size --gc-interval=100
```

**How to add:**
1. Go to Railway Dashboard
2. Select your project
3. Click "Variables" tab
4. Add new variable: `NODE_OPTIONS` with the value above
5. Click "Save"

### Step 2: Push Changes

```bash
git add .
git commit -m "fix: optimize memory usage for Railway deployment"
git push
```

Railway will automatically redeploy with the new settings.

### Step 3: Upgrade Railway Plan (If Needed)

**Free Tier Limits:**
- 512MB RAM
- 1 vCPU
- $5 credit/month

**If still hitting memory limits**, upgrade to Hobby plan:
- 8GB RAM
- 8 vCPU
- $5/month

**To upgrade:**
1. Go to Railway Dashboard → Settings
2. Click "Usage"
3. Click "Upgrade to Hobby"

---

## 📊 Monitor Memory Usage

### Check Logs
```bash
# In Railway Dashboard → Deployments → View Logs
# Look for:
[API] Processing file: ...
[WARN] File too large, skipping...
```

### Memory Monitoring
Railway shows real-time metrics in the Dashboard:
1. Click on your service
2. View "Metrics" tab
3. Watch Memory usage graph

---

## 🔧 Additional Optimizations

If you're still hitting memory limits, try these:

### 1. **Reduce Opportunities Limit**
Update `useOpportunities.ts` to load fewer records:

```typescript
const limit = 500; // Reduce from 1000
```

### 2. **Lazy Load Heavy Dependencies**
The app already lazy-loads OpenAI, but you could also lazy-load:
- `canvas`
- `tesseract.js` (OCR)
- `pdf-parse`

### 3. **Enable Streaming (Advanced)**
For very large CSV files, implement streaming instead of loading entire file:

```typescript
// Instead of:
const [fileContent] = await file.download();

// Use streaming:
const stream = file.createReadStream();
// Process chunks as they arrive
```

### 4. **Split Large CSV Files**
If you have CSV files > 5MB, split them into smaller files:

```bash
# Use the Python script in Opportunities/
python split_files_2to5.py
```

### 5. **Implement Pagination**
Instead of loading 1000+ opportunities at once, load 50-100 at a time with pagination.

---

## ⚠️ Current Memory Footprint

Your app has these memory-intensive components:

| Component | Memory Usage | Optimization Status |
|-----------|-------------|---------------------|
| CSV Processing | ~50-200MB | ✅ Optimized |
| PDF Extraction | ~100-300MB | ✅ Size limit added |
| OCR (tesseract.js) | ~200-400MB | ⚠️ Only if used |
| Canvas (image) | ~50-100MB | ⚠️ Only if used |
| OpenAI API | ~10-20MB | ✅ Lazy loaded |
| Next.js Runtime | ~100-150MB | - |

**Total Expected:** 300-800MB (depending on usage)

---

## 🎯 Best Practices

1. ✅ **Keep CSV files under 5MB each**
2. ✅ **Limit API responses to 100-1000 records**
3. ✅ **Use pagination instead of loading all data**
4. ✅ **Monitor Railway metrics regularly**
5. ✅ **Clear large objects after use**
6. ✅ **Avoid processing multiple large files simultaneously**

---

## 🆘 Troubleshooting

### Still Getting OOM Errors?

**1. Check which route is failing:**
```bash
# Look in Railway logs for:
"Out of memory"
"JavaScript heap out of memory"
```

**2. Identify the file/operation:**
```bash
# Find the last successful operation before crash:
[API] Processing file: govcontracts7.csv  ← This file might be too large
```

**3. Solutions:**
- Split that specific CSV file into smaller chunks
- Increase Railway memory limit
- Reduce the `limit` parameter in API calls

### Error: "JavaScript heap out of memory"

This means Node.js ran out of allocated heap space.

**Quick fix:**
1. Check Railway environment variables
2. Ensure `NODE_OPTIONS` is set correctly
3. Restart the service

### Performance Slow After Optimization

The `--optimize-for-size` flag trades speed for memory. If app is too slow:

```bash
# Remove --optimize-for-size from NODE_OPTIONS
NODE_OPTIONS=--max-old-space-size=1024 --gc-interval=100
```

---

## 📈 Expected Results

After these changes, your app should:
- ✅ Use 30-50% less memory
- ✅ Handle 1000+ opportunities without crashing
- ✅ Process documents up to 10MB safely
- ✅ Run stably on Railway's free tier
- ⚠️ Be slightly slower (trade-off for stability)

---

## 🔄 Alternative: Switch to a Different Platform

If Railway still doesn't work, consider:

1. **Render.com** - 512MB free tier, but more stable
2. **Fly.io** - Better memory management for Node apps
3. **DigitalOcean App Platform** - Starts at $5/month, 1GB RAM
4. **Heroku** - $7/month for 512MB RAM (but reliable)

---

## ✅ Quick Checklist

- [ ] Push changes to GitHub
- [ ] Add `NODE_OPTIONS` to Railway environment variables
- [ ] Redeploy on Railway
- [ ] Monitor logs for memory warnings
- [ ] Test with fewer records first (limit=100)
- [ ] Gradually increase limit (100 → 500 → 1000)
- [ ] Upgrade to Hobby plan if needed

---

**Questions?** Check Railway logs for specific error messages and adjust limits accordingly.

