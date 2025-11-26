# 🚨 DEPLOYMENT_NOT_FOUND Error - Quick Fix Guide

## What This Error Means

The `DEPLOYMENT_NOT_FOUND` error occurs when Vercel receives a request for a deployment that doesn't exist. This happens when:

1. ❌ **You haven't deployed yet** - Your project exists locally but not on Vercel
2. ❌ **Deployment was deleted** - Old preview deployments get cleaned up automatically
3. ❌ **Wrong URL** - Typo in the deployment URL or accessing wrong project
4. ❌ **No permissions** - Trying to access a deployment you don't have access to
5. ❌ **Project not linked** - No `.vercel/` folder means project isn't connected to Vercel

## Immediate Fix Checklist

### ✅ Step 1: Verify Project Status

```bash
cd webapp
ls -la .vercel  # Windows: dir .vercel
```

**If `.vercel` folder doesn't exist:** Your project isn't linked to Vercel yet.

### ✅ Step 2: Install Vercel CLI (if needed)

```bash
npm install -g vercel
```

### ✅ Step 3: Link Your Project

```bash
vercel link
```

Follow the prompts:
- Choose your Vercel scope (personal or team account)
- Link to existing project OR create a new one
- Confirm the project name

This creates a `.vercel/` folder with your project metadata.

### ✅ Step 4: Set Up Environment Variables

**Option A - Use the template:**
```bash
# Copy the template
cp env.template .env.local

# Edit with your actual values
# (use your favorite editor)
```

**Option B - Add directly to Vercel:**
```bash
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
vercel env add FIREBASE_PROJECT_ID
# ... continue for each variable
```

Or use the Vercel dashboard:
1. Go to vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add each variable from `env.template`

### ✅ Step 5: Deploy

**For testing (preview deployment):**
```bash
vercel
```

**For production:**
```bash
vercel --prod
```

## Understanding Your Current Setup

Your project structure:
```
my-firebase-project/
├── functions/          # Firebase Cloud Functions
└── webapp/            # Next.js frontend (THIS needs Vercel deployment)
    ├── src/
    ├── package.json
    ├── next.config.ts
    └── vercel.json    # ✅ Now created for you
```

### What's Different About Your Setup

You're using **Firebase for backend** + **Vercel for frontend**:

```
┌─────────────────────────────────────────┐
│ User's Browser                          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Vercel (Frontend - Next.js)             │
│ - Serves React pages                    │
│ - API routes                            │
│ - Static assets                         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Firebase (Backend)                      │
│ - Authentication                        │
│ - Firestore database                    │
│ - Storage                               │
│ - Cloud Functions                       │
└─────────────────────────────────────────┘
```

## Common Scenarios & Solutions

### Scenario 1: First-Time Deployment

**Symptoms:**
- No `.vercel` folder
- Never ran `vercel` command
- Getting error when trying to access URL

**Solution:**
Follow steps 1-5 above.

---

### Scenario 2: Trying to Access Old Preview Deployment

**Symptoms:**
- Previously working URL now returns 404
- URL looks like: `your-app-abc123-vercel.app`
- Deployment was from a feature branch

**Root Cause:**
Vercel automatically deletes preview deployments after:
- 30 days of inactivity
- When the Git branch is deleted
- When you manually delete them

**Solution:**
1. Don't bookmark preview deployment URLs
2. Use production URL for persistent links
3. Redeploy if you need that specific version:
   ```bash
   git checkout old-branch
   vercel --prod
   ```

---

### Scenario 3: Environment Variables Missing

**Symptoms:**
- Deployment succeeds but app doesn't work
- Firebase connection errors
- "API key not found" errors

**Solution:**
1. Check current env vars:
   ```bash
   vercel env ls
   ```

2. Add missing variables:
   ```bash
   vercel env add VARIABLE_NAME production
   ```

3. Redeploy for changes to take effect:
   ```bash
   vercel --prod
   ```

---

### Scenario 4: Build Failures

**Symptoms:**
- Deployment starts but fails during build
- Error shows in Vercel dashboard
- "Deployment failed" notification

**Common Causes & Fixes:**

**TypeScript errors:**
```bash
# Test build locally first
npm run build

# Fix any TypeScript errors
# Then deploy
vercel --prod
```

**Missing dependencies:**
```bash
# Make sure all deps are in package.json
npm install --save missing-package

# Commit package.json and package-lock.json
git add package.json package-lock.json
git commit -m "Add missing dependency"

# Deploy
vercel --prod
```

**Canvas/PDF issues:**
Your `next.config.ts` already handles this, but if issues persist:
```typescript
// next.config.ts already has:
config.externals.push('canvas');
```

---

## Vercel-Specific Best Practices

### 1. Environment Variable Management

```bash
# ✅ GOOD: Separate by environment
vercel env add MY_VAR production     # Only for production
vercel env add MY_VAR preview        # Only for preview deployments
vercel env add MY_VAR development    # For local development (vercel dev)

# ❌ BAD: Adding to all environments when not needed
```

### 2. Deployment Strategy

```bash
# ✅ GOOD: Test with preview first
vercel                    # Creates preview deployment
# Test thoroughly
vercel --prod            # Deploy to production

# ❌ BAD: Deploying untested code to production
vercel --prod            # No testing phase
```

### 3. Managing Multiple Environments

```bash
# Create separate Vercel projects for staging/production
vercel link --scope=my-team --project=my-app-staging
vercel link --scope=my-team --project=my-app-production

# Or use Git branch-based deployments:
# - main branch → production
# - develop branch → staging
# - feature/* → preview deployments
```

### 4. Firebase Integration Gotchas

**Private Key Formatting:**
```bash
# ✅ GOOD: Preserve newlines
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nMulti\nLine\nKey\n-----END PRIVATE KEY-----"

# ❌ BAD: Flattened key
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY----- Your Multi Line Key -----END PRIVATE KEY-----"
```

**To convert private key for Vercel:**
```bash
# If you have the key file:
cat service-account-key.json | jq -r '.private_key'

# This outputs with proper \n characters
# Copy the entire output including quotes when adding to Vercel
```

---

## Prevention Checklist

To avoid this error in the future:

- [ ] **Always link project first**: `vercel link` before `vercel --prod`
- [ ] **Test locally**: `npm run build` before deploying
- [ ] **Use environment variables**: Never hardcode deployment URLs
- [ ] **Monitor deployments**: Check Vercel dashboard after each deploy
- [ ] **Set up Git integration**: Automatic deployments catch issues early
- [ ] **Document the process**: Keep deployment steps in README
- [ ] **Bookmark production URL only**: Preview deployments are temporary
- [ ] **Version control .vercel/project.json**: Add to git (but not .vercel/output/)

---

## Verification Steps

After fixing, verify everything works:

```bash
# 1. Check project is linked
ls .vercel/project.json  # Should exist

# 2. Check current deployment
vercel ls

# 3. Check environment variables
vercel env ls

# 4. Deploy and test
vercel --prod

# 5. Open in browser
vercel open
```

## Still Having Issues?

1. **Check deployment logs:**
   ```bash
   vercel logs
   ```

2. **Check build logs in dashboard:**
   - Go to vercel.com/dashboard
   - Select your project
   - Click on the failed deployment
   - Review the build logs

3. **Verify account access:**
   ```bash
   vercel whoami
   ```
   Make sure you're logged into the correct account.

4. **Common error patterns:**
   - `DEPLOYMENT_NOT_FOUND`: Follow this guide
   - `BUILD_ERROR`: Check `vercel logs` and fix code issues
   - `DEPLOYMENT_ERROR`: Usually environment variable issues
   - `NO_FUNCTIONS_BUILT`: Check API routes in `src/app/api/`

## Need More Help?

- 📖 Full deployment guide: See `VERCEL_DEPLOYMENT_GUIDE.md`
- 🔧 Vercel documentation: https://vercel.com/docs
- 💬 Vercel Discord: https://vercel.com/discord
- 🎫 Vercel support: https://vercel.com/support

---

## Quick Command Reference

```bash
# Setup
vercel login                  # Authenticate
vercel link                   # Link project
vercel env add VAR_NAME      # Add environment variable

# Deploy
vercel                       # Preview deployment
vercel --prod               # Production deployment

# Manage
vercel ls                    # List deployments
vercel logs                  # View logs
vercel logs [deployment-url] # Logs for specific deployment
vercel rollback             # Roll back to previous deployment
vercel env ls               # List environment variables
vercel env rm VAR_NAME      # Remove environment variable

# Info
vercel whoami               # Check logged-in user
vercel inspect [url]        # Get deployment info
vercel domains ls           # List domains
```



