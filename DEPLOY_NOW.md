# 🚀 Quick Deployment Guide - Get Your App Live!

This guide will walk you through deploying your Next.js app to Vercel (the easiest and best option for Next.js apps).

## 📋 Prerequisites Checklist

Before you start, make sure you have:
- [ ] A Vercel account (free at [vercel.com](https://vercel.com))
- [ ] Your Firebase project credentials ready
- [ ] Node.js installed (you already have this if the app runs locally)

---

## 🎯 Step 1: Install Vercel CLI

Open your terminal in the `webapp` folder and run:

```bash
npm install -g vercel
```

This installs the Vercel command-line tool globally.

---

## 🔗 Step 2: Link Your Project to Vercel

In the `webapp` directory, run:

```bash
vercel link
```

You'll be prompted to:
1. **Log in** - If not logged in, it will open your browser to authenticate
2. **Select scope** - Choose "Personal" (unless you have a team account)
3. **Link to existing project?** - Choose **"No"** (create a new project)
4. **Project name** - Enter a name (e.g., "rfp-matcher" or "my-app")
5. **Directory** - Press Enter (it should detect `.` automatically)

This creates a `.vercel` folder with your project configuration.

---

## 🔐 Step 3: Add Environment Variables

You need to add all your Firebase credentials to Vercel. You have two options:

### Option A: Via Vercel Dashboard (Easier)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable one by one:

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
```
```
OPENAI_API_KEY
```

**Important Notes:**
- For `FIREBASE_PRIVATE_KEY`: Copy the entire key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Make sure to select **"Production"**, **"Preview"**, and **"Development"** for each variable (or at least Production)
- Get these values from your Firebase Console → Project Settings → General

### Option B: Via CLI (For Advanced Users)

```bash
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
# Enter the value when prompted
# Repeat for each variable
```

---

## 🧪 Step 4: Test with Preview Deployment

Before going to production, test with a preview:

```bash
vercel
```

This will:
- Build your app
- Deploy it to a preview URL (like `your-app-abc123.vercel.app`)
- Show you the deployment URL

**Test the preview:**
- [ ] Can you access the site?
- [ ] Does login work?
- [ ] Can you upload files?
- [ ] Do pages load correctly?

If everything works, proceed to production!

---

## 🚀 Step 5: Deploy to Production

Once the preview works, deploy to production:

```bash
vercel --prod
```

This deploys to your production URL (usually `your-project-name.vercel.app`).

**🎉 Congratulations! Your app is now live!**

---

## 🔄 Step 6: Set Up Automatic Deployments (Optional but Recommended)

Connect your Git repository for automatic deployments:

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Go to **Settings** → **Git**
4. Connect your repository (GitHub, GitLab, or Bitbucket)
5. Configure:
   - **Production Branch**: `main` or `master`
   - **Framework Preset**: Next.js (auto-detected)

Now, every time you push to your main branch, Vercel will automatically deploy!

---

## 🌐 Step 7: Add Custom Domain (Optional)

If you have a custom domain:

1. Go to **Settings** → **Domains**
2. Add your domain (e.g., `myapp.com`)
3. Follow the DNS configuration instructions
4. Wait for DNS propagation (usually 5-30 minutes)

---

## 🐛 Troubleshooting

### Build Fails

**Error: "Module not found"**
- Make sure all dependencies are in `package.json`
- Run `npm install` locally to verify

**Error: "Environment variable missing"**
- Double-check all environment variables are set in Vercel dashboard
- Make sure they're set for "Production" environment

### App Works But Firebase Doesn't Connect

**Check:**
1. All `NEXT_PUBLIC_*` variables are set correctly
2. Firebase project ID matches in all variables
3. Firebase project has the correct settings enabled (Auth, Firestore, Storage)

### Private Key Issues

**Error: "Invalid private key"**
- Make sure the entire key is copied, including BEGIN/END lines
- In Vercel, the key should be on one line with `\n` for newlines
- Format: `"-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----"`

### Can't Access Deployed Site

**Check:**
1. Deployment completed successfully (check Vercel dashboard)
2. You're using the correct URL
3. No browser cache issues (try incognito mode)

---

## 📊 Monitoring Your Deployment

After deployment:

1. **View Logs**: `vercel logs` or check Dashboard → Deployments → View Function Logs
2. **Check Analytics**: Dashboard → Analytics (shows visitors, performance)
3. **View Deployments**: Dashboard → Deployments (see all versions)

---

## 🔄 Updating Your App

### Manual Update
```bash
vercel --prod
```

### Automatic Update (if Git connected)
```bash
git add .
git commit -m "Update app"
git push origin main
# Vercel automatically deploys!
```

### Rollback to Previous Version
1. Go to Vercel Dashboard → Deployments
2. Find the previous working deployment
3. Click "..." → "Promote to Production"

---

## ✅ Post-Deployment Checklist

After your first deployment:

- [ ] Production URL works
- [ ] Login/authentication works
- [ ] File uploads work
- [ ] Database reads/writes work
- [ ] All pages load correctly
- [ ] No console errors in browser
- [ ] Mobile view looks good

---

## 🆘 Need Help?

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Check your deployment logs**: `vercel logs` or Dashboard → Deployments

---

## 🎯 Quick Command Reference

```bash
# Install Vercel CLI
npm install -g vercel

# Link project (first time only)
vercel link

# Deploy preview
vercel

# Deploy production
vercel --prod

# View logs
vercel logs

# List deployments
vercel ls

# Remove deployment
vercel remove
```

---

**You're all set! Your app should be live and accessible to the world! 🌍**

