# Eventarc Service Agent Permission Troubleshooting

## Problem

When deploying 2nd gen Firebase Functions with Firestore triggers, you may encounter this error:

```
Permission denied while using the Eventarc Service Agent. 
If you recently started to use Eventarc, it may take a few minutes 
before all necessary permissions are propagated to the Service Agent. 
Otherwise, verify that it has Eventarc Service Agent role.
```

## Root Cause

Firebase 2nd gen Functions use Eventarc (Event Architecture) to handle Firestore triggers. The Eventarc Service Agent needs specific IAM permissions to create and manage these triggers.

## Quick Fix

### Option 1: Automated Script (Recommended)

```powershell
.\fix-eventarc-permissions.ps1
```

This script will:
1. Get your project number
2. Grant the Eventarc Service Agent role
3. Grant the Pub/Sub Service Agent role (if needed)
4. Provide next steps

### Option 2: Manual Fix with gcloud CLI

1. **Get your project number:**
   ```powershell
   gcloud projects describe therfpqueen-f11fd --format="value(projectNumber)"
   ```
   Note the project number (e.g., `173138212955`)

2. **Grant Eventarc Service Agent role:**
   ```powershell
   $projectNumber = "173138212955"  # Replace with your project number
   $serviceAgent = "service-$projectNumber@gcp-sa-eventarc.iam.gserviceaccount.com"
   
   gcloud projects add-iam-policy-binding therfpqueen-f11fd `
       --member="serviceAccount:$serviceAgent" `
       --role="roles/eventarc.serviceAgent"
   ```

3. **Grant Pub/Sub Service Agent role (often needed together):**
   ```powershell
   $pubsubAgent = "service-$projectNumber@gcp-sa-pubsub.iam.gserviceaccount.com"
   
   gcloud projects add-iam-policy-binding therfpqueen-f11fd `
       --member="serviceAccount:$pubsubAgent" `
       --role="roles/pubsub.serviceAgent"
   ```

4. **Wait 2-5 minutes** for permissions to propagate

5. **Retry deployment:**
   ```powershell
   cd functions
   firebase deploy --only functions
   ```

### Option 3: Google Cloud Console (Manual)

1. Go to [IAM & Admin](https://console.cloud.google.com/iam-admin/iam?project=therfpqueen-f11fd)

2. Find your project number:
   - Go to [Project Settings](https://console.cloud.google.com/iam-admin/settings?project=therfpqueen-f11fd)
   - Note the "Project number" (e.g., `173138212955`)

3. Add the Eventarc Service Agent:
   - Click "Grant Access"
   - In "New principals", enter:
     ```
     service-<project-number>@gcp-sa-eventarc.iam.gserviceaccount.com
     ```
     Replace `<project-number>` with your actual project number
   - Select role: **Eventarc Service Agent**
   - Click "Save"

4. Optionally add Pub/Sub Service Agent:
   - Click "Grant Access" again
   - Enter:
     ```
     service-<project-number>@gcp-sa-pubsub.iam.gserviceaccount.com
     ```
   - Select role: **Pub/Sub Service Agent**
   - Click "Save"

5. Wait 2-5 minutes for permissions to propagate

6. Retry deployment

## Verification

After granting permissions, verify they're set correctly:

```powershell
# Check Eventarc Service Agent
$projectNumber = "173138212955"  # Your project number
$serviceAgent = "service-$projectNumber@gcp-sa-eventarc.iam.gserviceaccount.com"

gcloud projects get-iam-policy therfpqueen-f11fd \
    --flatten="bindings[].members" \
    --filter="bindings.members:$serviceAgent" \
    --format="table(bindings.role)"
```

You should see `roles/eventarc.serviceAgent` in the output.

## Common Issues

### "Permission denied" persists after granting role

**Solution:** Wait longer (up to 10 minutes). IAM permission propagation can take time.

### "gcloud: command not found"

**Solution:** Install Google Cloud SDK:
- Windows: https://cloud.google.com/sdk/docs/install
- Or use Google Cloud Console method (Option 3 above)

### "Insufficient permissions to grant IAM role"

**Solution:** You need one of these roles on the project:
- Owner
- Editor
- Security Admin
- IAM Admin

Ask your project administrator to grant you one of these roles, or have them run the fix script.

### Deployment still fails after 10 minutes

**Solution:**
1. Double-check the service agent email is correct
2. Verify the role was granted in IAM console
3. Try deleting and recreating the function:
   ```powershell
   # Delete function (if it exists)
   gcloud functions delete onUserCreated --region=us-central1 --gen2
   
   # Wait a minute, then redeploy
   cd functions
   firebase deploy --only functions
   ```

## Prevention

For future projects, grant these permissions before first deployment:

```powershell
# Run this before first deployment
.\fix-eventarc-permissions.ps1
```

## Additional Resources

- [Eventarc Documentation](https://cloud.google.com/eventarc/docs)
- [Firebase Functions 2nd Gen](https://firebase.google.com/docs/functions/2nd-gen)
- [IAM Roles for Eventarc](https://cloud.google.com/eventarc/docs/reference/iam/roles)

## Still Having Issues?

1. Check Firebase Console → Functions → Logs for detailed error messages
2. Verify your Firebase project has billing enabled (required for 2nd gen functions)
3. Ensure you're using the correct project: `firebase use therfpqueen-f11fd`
4. Check that all required APIs are enabled:
   - Cloud Functions API
   - Eventarc API
   - Pub/Sub API
   - Cloud Build API
