# Deployment Architecture: Understanding Your Stack

## Overview

Your RFP Matcher application uses a **hybrid architecture** with two separate deployment platforms:

```
┌──────────────────────────────────────────────────────────────┐
│                    INTERNET / USER                            │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ HTTPS
                         │
        ┌────────────────▼──────────────────┐
        │                                    │
        │    YOUR DOMAIN (Optional)          │
        │    www.rfpmatcher.com             │
        │                                    │
        └────────────────┬──────────────────┘
                         │
                         │ Points to
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                                                                │
│                      VERCEL (Frontend)                         │
│                   ┌──────────────────────┐                     │
│                   │   Next.js App        │                     │
│                   │   - React UI         │                     │
│                   │   - Server Routes    │                     │
│                   │   - Static Assets    │                     │
│                   └──────────┬───────────┘                     │
│                              │                                 │
│    Deployments:              │ API Calls                      │
│    - Production: main branch │                                 │
│    - Preview: feature branches│                                │
│    - Each deployment = unique URL                              │
│                              │                                 │
└──────────────────────────────┼─────────────────────────────────┘
                               │
                               │ Firebase SDK
                               │ (Authenticated)
                               │
┌──────────────────────────────▼─────────────────────────────────┐
│                                                                  │
│                    FIREBASE (Backend)                            │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │ Authentication  │  │   Firestore     │  │    Storage     │ │
│  │                 │  │   (Database)    │  │  (Documents)   │ │
│  │ - User login    │  │ - User data     │  │ - PDF files    │ │
│  │ - JWT tokens    │  │ - Opportunities │  │ - DOCX files   │ │
│  └─────────────────┘  └─────────────────┘  └────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            Cloud Functions (Optional)                     │  │
│  │            - Background processing                        │  │
│  │            - Scheduled tasks                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## How Deployments Work

### The Vercel Deployment Lifecycle

```
Local Development          Vercel Cloud                     Live Site
─────────────────         ──────────────                   ─────────

  ┌─────────┐
  │  Code   │
  │ Changes │
  └────┬────┘
       │
       │ git push / vercel command
       │
       ▼
  ┌─────────────┐
  │   Vercel    │ ──────────> Build Environment
  │  Receives   │              - Installs deps
  │   Commit    │              - Runs npm build
  └─────┬───────┘              - Bundles code
        │                      - Optimizes assets
        │
        │ Build Success?
        │
        ├─ YES ───> Create Deployment
        │            - Unique URL generated
        │            - Deploy ID: dpl_abc123
        │            - URL: myapp-abc123.vercel.app
        │            │
        │            ▼
        │          ┌─────────────────┐
        │          │ Deployment Lives │ ──> Accessible via URL
        │          │ in Edge Network  │     (until deleted)
        │          └─────────────────┘
        │
        └─ NO ───> Build Failed
                   - Error in logs
                   - No deployment created
                   - DEPLOYMENT_NOT_FOUND if you try to access it
```

### Why Deployments Get "Lost" (DEPLOYMENT_NOT_FOUND)

```
Timeline of a Deployment:

Day 0: Create Feature Branch
    │
    ├─> git push
    │
    └─> Vercel creates preview deployment
        URL: myapp-feat-abc123.vercel.app
        Status: ✅ Available


Day 5: Merge to main
    │
    ├─> Preview deployment still exists
    │   Status: ✅ Available (but orphaned)
    │
    └─> New production deployment created
        URL: myapp.vercel.app (or custom domain)
        Status: ✅ Available


Day 10: Delete feature branch
    │
    └─> Vercel auto-deletes preview deployment
        URL: myapp-feat-abc123.vercel.app
        Status: ❌ DEPLOYMENT_NOT_FOUND


If you try to access myapp-feat-abc123.vercel.app now:
→ HTTP 404
→ Error: DEPLOYMENT_NOT_FOUND
```

## Your Specific Setup

### Current State Analysis

Based on your project structure:

```
my-firebase-project/
│
├── functions/              ← Firebase Cloud Functions
│   ├── src/
│   ├── package.json
│   └── firebase.json       ← Deployed to Firebase
│
└── webapp/                 ← Next.js Frontend
    ├── src/
    │   ├── app/           ← Pages and routes
    │   ├── components/    ← React components
    │   └── lib/           ← Firebase config
    ├── package.json
    ├── next.config.ts
    ├── vercel.json        ← ✅ NOW EXISTS (created for you)
    └── .vercel/           ← ❌ MISSING (need to run 'vercel link')
```

### What You Need to Deploy

**For Firebase** (already done):
```bash
cd functions
firebase deploy --only functions
```

**For Vercel** (need to do):
```bash
cd webapp
vercel link        # ← THIS IS THE KEY STEP YOU'RE MISSING
vercel --prod      # ← Then deploy
```

## Environment Flow

### Local Development

```
Your Computer
├── .env.local               ← Environment variables for local dev
├── Firebase Emulators (optional)
│   ├── Auth Emulator
│   ├── Firestore Emulator
│   └── Storage Emulator
└── Next.js Dev Server
    └── localhost:3000
```

### Vercel Production

```
Vercel Edge Network
├── Environment Variables     ← Set in Vercel Dashboard
│   ├── NEXT_PUBLIC_* vars   ← Exposed to browser
│   └── Server-only vars     ← Hidden from browser
│
├── Serverless Functions      ← API routes become functions
│   └── src/app/api/*        ← Each route = separate function
│
└── Static Assets            ← Pre-rendered pages + assets
    └── CDN distributed      ← Fast global access
```

## Data Flow Example

### User Uploads Document

```
1. User clicks upload button
   │
   ▼
2. Browser (Vercel-hosted page)
   │
   ├─> Calls Firebase Auth
   │   └─> Gets user token
   │
   ├─> Calls Firebase Storage
   │   └─> Uploads file directly
   │   └─> Returns download URL
   │
   └─> Calls Firestore
       └─> Saves metadata + URL
       
3. Document appears in list
   (Real-time update via Firestore listeners)
```

Key point: **File never goes through Vercel** - it goes directly to Firebase Storage. Vercel only serves the UI and orchestrates the flow.

## Common Misconceptions

### ❌ Misconception 1: "Vercel hosts everything"

**Reality:**
```
Vercel:                    Firebase:
- UI only                  - Authentication
- API routes               - Database
- Static pages             - File storage
                           - Business logic (functions)
```

### ❌ Misconception 2: "I can just push code and it works"

**Reality:**
```
Steps Required:
1. Link project (vercel link)        ← ONE TIME
2. Set environment variables         ← ONE TIME
3. Deploy (vercel --prod)           ← EVERY UPDATE
4. Test                             ← EVERY DEPLOYMENT
```

### ❌ Misconception 3: "Preview deployments last forever"

**Reality:**
```
Production:        Preview:
- Persists         - Auto-deleted after 30 days
- Custom domain    - Random URL
- Stable           - Temporary
```

### ❌ Misconception 4: "Environment variables sync automatically"

**Reality:**
```
Local (.env.local)     ────────────────────────────────────────────────────────────────────────────
                                                                                                   │
                                                                                                   │
Vercel (Dashboard)     ────────────────────────────────────────────────────────────────────────────
                                                                                                   
                       ↑                                                                           
                       │                                                                           
                       └── You must manually sync these!                                           
```

## Deployment Checklist

### First Time Setup

- [ ] Create Vercel account
- [ ] Install Vercel CLI: `npm i -g vercel`
- [ ] Link project: `vercel link`
- [ ] Add environment variables (see `env.template`)
- [ ] Test build locally: `npm run build`
- [ ] Deploy preview: `vercel`
- [ ] Test preview deployment thoroughly
- [ ] Deploy production: `vercel --prod`
- [ ] Add custom domain (optional)
- [ ] Set up monitoring

### Every Subsequent Deployment

- [ ] Test changes locally
- [ ] Commit to git
- [ ] Deploy: `vercel --prod` (or git push if auto-deploy enabled)
- [ ] Monitor build in dashboard
- [ ] Test production site
- [ ] Check error logs if issues occur

## Monitoring Your Deployments

### View All Deployments

```bash
vercel ls

# Output example:
# myapp (my-team)
# Production: myapp-abc123-vercel.app (current)
# Preview:    myapp-xyz789-vercel.app
```

### View Logs

```bash
# Real-time logs
vercel logs --follow

# Logs from specific deployment
vercel logs https://myapp-abc123.vercel.app
```

### Dashboard Overview

Visit: `https://vercel.com/[your-team]/[project-name]`

You'll see:
- ✅ Successful deployments (green)
- ⏳ Building deployments (yellow)
- ❌ Failed deployments (red)
- 📊 Analytics
- ⚡ Performance metrics

## Troubleshooting Decision Tree

```
Getting DEPLOYMENT_NOT_FOUND?
│
├─> Is .vercel/ folder present?
│   │
│   ├─ NO ──> Run 'vercel link'
│   │         Then 'vercel --prod'
│   │
│   └─ YES ─> Continue
│
├─> Have you ever deployed successfully?
│   │
│   ├─ NO ──> This is first deployment
│   │         │
│   │         ├─> Check env vars set
│   │         ├─> Test build locally
│   │         └─> Run 'vercel --prod'
│   │
│   └─ YES ─> Continue
│
├─> Are you accessing an old URL?
│   │
│   ├─ YES ─> Deployment was deleted
│   │         │
│   │         └─> Use production URL instead
│   │             or redeploy that version
│   │
│   └─ NO ──> Continue
│
├─> Did the build fail?
│   │
│   ├─ YES ─> Check build logs
│   │         │
│   │         ├─> Fix TypeScript errors
│   │         ├─> Add missing dependencies
│   │         └─> Redeploy
│   │
│   └─ NO ──> Continue
│
└─> Check permissions and account
    │
    ├─> Run 'vercel whoami'
    ├─> Verify correct team/account
    └─> Check project access in dashboard
```

## Best Practices Summary

### ✅ DO:

1. **Use environment variables** for all configuration
2. **Link project first** before deploying
3. **Test locally** before each deployment
4. **Monitor deployments** in the dashboard
5. **Keep production URLs** stable (use custom domains)
6. **Version control** your .vercel/project.json
7. **Document** your deployment process

### ❌ DON'T:

1. **Don't hardcode** deployment URLs in code
2. **Don't bookmark** preview deployment URLs
3. **Don't commit** .env files or secrets
4. **Don't skip** local build testing
5. **Don't deploy** without environment variables
6. **Don't ignore** build warnings
7. **Don't delete** deployments you might need to reference

## Next Steps

1. **Read the quick fix guide**: `DEPLOYMENT_NOT_FOUND_FIX.md`
2. **Follow deployment guide**: `VERCEL_DEPLOYMENT_GUIDE.md`
3. **Set up environment variables**: Use `env.template`
4. **Deploy**: Run `vercel link` then `vercel --prod`
5. **Test**: Verify everything works in production
6. **Monitor**: Keep an eye on logs and analytics

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Firebase Web Setup](https://firebase.google.com/docs/web/setup)
- [Environment Variables in Vercel](https://vercel.com/docs/concepts/projects/environment-variables)




