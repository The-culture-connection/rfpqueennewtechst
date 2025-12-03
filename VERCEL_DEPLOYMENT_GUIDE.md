# Vercel Deployment Guide for RFP Matcher

## Prerequisites
- [ ] Vercel account created
- [ ] Vercel CLI installed: `npm i -g vercel`
- [ ] All Firebase credentials ready
- [ ] Firebase service account key downloaded

## Step-by-Step Deployment

### 1. Prepare Environment Variables

Create a `.env.production` file (DO NOT commit this):

```bash
# Firebase Public Config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (Server-side only)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# OpenAI (if using AI extraction)
OPENAI_API_KEY=your_openai_key
```

### 2. Link Project to Vercel

```bash
cd webapp
vercel link
```

Follow the prompts:
- Select your scope (personal/team)
- Link to existing project or create new
- Choose project name

This creates `.vercel/` directory with project metadata.

### 3. Add Environment Variables to Vercel

Option A - Via CLI (recommended for sensitive keys):
```bash
# Add each variable
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
vercel env add FIREBASE_PRIVATE_KEY production
# ... repeat for all vars
```

Option B - Via Dashboard:
1. Go to vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add each variable (ensure correct environment: production/preview/development)

### 4. Test with Preview Deployment

```bash
vercel
```

This creates a preview deployment. Test it thoroughly:
- [ ] Login works
- [ ] Firebase connection works
- [ ] File uploads work
- [ ] AI extraction works (if enabled)

### 5. Deploy to Production

```bash
vercel --prod
```

### 6. Configure Custom Domain (Optional)

```bash
vercel domains add yourdomain.com
```

Then add DNS records as instructed.

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Ensure Node version compatibility

### Firebase Connection Fails
- Verify environment variables are set correctly
- Check Firebase private key format (must include `\n` for newlines)
- Ensure service account has correct permissions

### 404 Errors on Routes
- Next.js app router requires correct folder structure
- Check that all pages are in `src/app/` directory

### Canvas/PDF Issues
- The `next.config.ts` already handles this with webpack config
- Canvas is externalized for server-side rendering

## Monitoring

After deployment:
- Monitor function logs: `vercel logs`
- Check analytics in Vercel dashboard
- Set up Firebase monitoring for backend

## Updating Deployments

Every git push (if using Git integration) or `vercel --prod` creates a NEW deployment.

To roll back:
```bash
vercel rollback
```

Or use the Vercel dashboard to promote an older deployment.




