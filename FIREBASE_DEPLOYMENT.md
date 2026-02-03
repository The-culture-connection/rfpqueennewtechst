# Firebase Functions Deployment Guide

## Quick Deploy (PowerShell)

### Option 1: Full Deployment Script (Recommended)
```powershell
.\deploy-firebase-functions.ps1
```

This script will:
- ✅ Check Node.js version
- ✅ Install dependencies
- ✅ Build TypeScript
- ✅ Verify build output
- ✅ Deploy to Firebase
- ✅ Show deployment status

### Option 2: Quick Deploy (Minimal Output)
```powershell
.\deploy-functions-quick.ps1
```

### Option 3: Manual Commands
```powershell
cd functions
npm install
npm run build
firebase deploy --only functions
cd ..
```

## Prerequisites

1. **Node.js 22+** (check: `node --version`)
2. **Firebase CLI** (install: `npm install -g firebase-tools`)
3. **Firebase Login** (run: `firebase login`)
4. **Project Access** (verify: `firebase projects:list`)

## Pre-Deployment Checklist

- [ ] Node.js 22+ installed
- [ ] Firebase CLI installed and logged in
- [ ] Project selected: `firebase use thermfpqueen-f11fd` (or your project)
- [ ] Dependencies installed: `cd functions && npm install`
- [ ] TypeScript compiles: `npm run build`
- [ ] Existing functions preserved (if needed, see WEBHOOK_MIGRATION.md)

## Deployment Steps

### 1. Navigate to Functions Directory
```powershell
cd functions
```

### 2. Install Dependencies
```powershell
npm install
```

### 3. Build TypeScript
```powershell
npm run build
```

**Expected output:**
- Creates `lib/` directory
- Compiles `src/**/*.ts` → `lib/**/*.js`
- Should show no errors

### 4. Verify Build
```powershell
# Check if compiled files exist
Test-Path lib/index.js
Test-Path lib/webhook/*.js
```

### 5. Deploy Functions
```powershell
firebase deploy --only functions
```

**Or deploy specific functions:**
```powershell
# Deploy only webhook functions
firebase deploy --only functions:onUserCreated,functions:onDocumentUploadedCreate,functions:onDocumentUploadedUpdate,functions:onOpportunitySaved,functions:onOpportunityApplied,functions:onOpportunitiesRecommended,functions:onOpportunityAnalyzed,functions:persistRecommendations
```

## Post-Deployment

### Verify Deployment
```powershell
# List deployed functions
firebase functions:list

# View function URLs
firebase functions:config:get
```

### Test Webhooks
1. Create integration in Firestore (see WEBHOOK_SETUP.md)
2. Trigger test events:
   - Create user profile → `user.created`
   - Upload document → `document.uploaded`
   - Save opportunity → `opportunity.saved`
3. Check logs: `firebase functions:log`

### Monitor Logs
```powershell
# View real-time logs
firebase functions:log

# View logs for specific function
firebase functions:log --only onUserCreated

# View logs with filters
firebase functions:log --only onUserCreated --limit 50
```

## Troubleshooting

### Build Errors

**TypeScript compilation errors:**
```powershell
# Check TypeScript version
npm list typescript

# Clear and rebuild
Remove-Item -Recurse -Force lib
npm run build
```

**Missing dependencies:**
```powershell
# Clean install
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Deployment Errors

**Authentication:**
```powershell
# Re-login to Firebase
firebase logout
firebase login
```

**Project not selected:**
```powershell
# List projects
firebase projects:list

# Select project
firebase use thermfpqueen-f11fd
```

**Permission errors:**
- Verify you have "Firebase Admin" or "Editor" role
- Check Firebase Console → IAM & Admin

**Eventarc Service Agent Permission Error:**
This is a common issue when deploying 2nd gen Firebase Functions for the first time.

**Error message:**
```
Permission denied while using the Eventarc Service Agent. 
If you recently started to use Eventarc, it may take a few minutes 
before all necessary permissions are propagated to the Service Agent.
```

**Quick fix (PowerShell):**
```powershell
.\fix-eventarc-permissions.ps1
```

**Manual fix:**
1. Get your project number:
   ```powershell
   gcloud projects describe therfpqueen-f11fd --format="value(projectNumber)"
   ```

2. Grant Eventarc Service Agent role:
   ```powershell
   $projectNumber = "<your-project-number>"
   $serviceAgent = "service-$projectNumber@gcp-sa-eventarc.iam.gserviceaccount.com"
   gcloud projects add-iam-policy-binding therfpqueen-f11fd `
       --member="serviceAccount:$serviceAgent" `
       --role="roles/eventarc.serviceAgent"
   ```

3. Wait 2-5 minutes for permissions to propagate

4. Retry deployment:
   ```powershell
   cd functions
   firebase deploy --only functions
   ```

**Alternative: Use Google Cloud Console**
1. Go to: https://console.cloud.google.com/iam-admin/iam?project=therfpqueen-f11fd
2. Find or add the Eventarc Service Agent: `service-<project-number>@gcp-sa-eventarc.iam.gserviceaccount.com`
3. Grant role: **Eventarc Service Agent**
4. Wait 2-5 minutes and retry deployment

**Function timeout:**
- Check function timeout settings in `functions/src/index.ts`
- Default is 60s, can be increased for large operations

### Runtime Errors

**Check function logs:**
```powershell
firebase functions:log --only onUserCreated
```

**Check Firestore rules:**
- Webhook triggers need read access to Firestore
- Verify rules allow function access

**Check integration configuration:**
- Verify `integrations` collection exists
- Check `isActive: true`
- Verify `enabledEvents` array includes event types

## Deployment Output

After successful deployment, you'll see:

```
✔  functions[onUserCreated(us-central1)] Successful create operation.
✔  functions[onDocumentUploadedCreate(us-central1)] Successful create operation.
✔  functions[onDocumentUploadedUpdate(us-central1)] Successful create operation.
✔  functions[onOpportunitySaved(us-central1)] Successful create operation.
✔  functions[onOpportunityApplied(us-central1)] Successful create operation.
✔  functions[onOpportunitiesRecommended(us-central1)] Successful create operation.
✔  functions[onOpportunityAnalyzed(us-central1)] Successful create operation.
✔  functions[persistRecommendations(us-central1)] Successful create operation.

Functions deployed:
  onUserCreated: https://us-central1-therfpqueen-f11fd.cloudfunctions.net/onUserCreated
  ...
```

## Rollback

If deployment causes issues:

```powershell
# View deployment history
firebase functions:list --only onUserCreated

# Redeploy previous version (if using version control)
git checkout <previous-commit>
cd functions
npm run build
firebase deploy --only functions
```

## Important Notes

1. **Existing Functions**: If you have existing functions (samGov, grantsGov, etc.), they need to be merged into `src/index.ts` before building. See `WEBHOOK_MIGRATION.md`.

2. **Build Output**: The build creates `lib/index.js` from `src/index.ts`. Make sure both webhook functions AND existing functions are exported.

3. **First Deployment**: First deployment may take 5-10 minutes as Firebase sets up the function infrastructure.

4. **Subsequent Deployments**: Usually faster (1-3 minutes) as only changed functions are updated.

5. **Cost**: Each trigger execution counts toward Firebase Functions usage. Monitor usage in Firebase Console.

## Quick Reference

| Command | Description |
|---------|-------------|
| `.\deploy-firebase-functions.ps1` | Full deployment with checks |
| `.\deploy-functions-quick.ps1` | Quick deploy (minimal output) |
| `firebase deploy --only functions` | Deploy all functions |
| `firebase functions:log` | View function logs |
| `firebase functions:list` | List deployed functions |
| `firebase use <project-id>` | Select Firebase project |
