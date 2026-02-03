# Firebase Functions Deployment Command Reference

## ⚠️ Important: Correct Function Names

The following functions are **NOT** exported and should **NOT** be included in deployment commands:

- ❌ `onDocumentUploaded` - This doesn't exist. Use `onDocumentUploadedCreate` and `onDocumentUploadedUpdate` instead
- ❌ `onOpportunityOutcomeRecorded` - This is commented out and not implemented yet

## ✅ Correct Deployment Commands

### Deploy All Functions
```powershell
cd functions
firebase deploy --only functions
```

### Deploy Only Webhook Functions (Recommended)
```powershell
.\deploy-webhook-functions.ps1
```

### Deploy Specific Functions Manually
```powershell
cd functions
firebase deploy --only `
    functions:onUserCreated,`
    functions:onDocumentUploadedCreate,`
    functions:onDocumentUploadedUpdate,`
    functions:onOpportunitySaved,`
    functions:onOpportunityApplied,`
    functions:onOpportunitiesRecommended,`
    functions:onOpportunityAnalyzed,`
    functions:persistRecommendations
```

### Single Line Command (for copy-paste)
```powershell
cd functions && firebase deploy --only functions:onUserCreated,functions:onDocumentUploadedCreate,functions:onDocumentUploadedUpdate,functions:onOpportunitySaved,functions:onOpportunityApplied,functions:onOpportunitiesRecommended,functions:onOpportunityAnalyzed,functions:persistRecommendations
```

## Function Reference

| Function Name | Status | Description |
|--------------|--------|-------------|
| `onUserCreated` | ✅ Active | Fires when a user profile is created |
| `onDocumentUploadedCreate` | ✅ Active | Fires when a document is created with completed status |
| `onDocumentUploadedUpdate` | ✅ Active | Fires when document processing status changes to completed |
| `onOpportunitySaved` | ✅ Active | Fires when an opportunity is saved to user's tracker |
| `onOpportunityApplied` | ✅ Active | Fires when an opportunity is marked as applied |
| `onOpportunitiesRecommended` | ✅ Active | Fires when algorithm generates recommendations |
| `onOpportunityAnalyzed` | ✅ Active | Fires when opportunity analysis scores are updated |
| `persistRecommendations` | ✅ Active | Persists recommendation data to Firestore |
| `onOpportunityOutcomeRecorded` | ❌ Not Implemented | Commented out - TODO for future implementation |

## Common Errors

### Error: "No function matches given --only filters"

**Cause:** You're trying to deploy a function that doesn't exist.

**Common mistakes:**
- Using `onDocumentUploaded` instead of `onDocumentUploadedCreate` and `onDocumentUploadedUpdate`
- Including `onOpportunityOutcomeRecorded` (not implemented)

**Solution:** Use the correct function names from the list above.

### Error: "Permission denied while using the Eventarc Service Agent"

**Solution:** Run the fix script first:
```powershell
.\fix-eventarc-permissions.ps1
```

Then wait 2-5 minutes before deploying.

## Quick Start

1. **Fix Eventarc permissions** (first time only):
   ```powershell
   .\fix-eventarc-permissions.ps1
   ```

2. **Wait 2-5 minutes** for permissions to propagate

3. **Deploy webhook functions**:
   ```powershell
   .\deploy-webhook-functions.ps1
   ```

## Verification

After deployment, verify functions are deployed:
```powershell
firebase functions:list
```

You should see all 8 webhook functions listed.
