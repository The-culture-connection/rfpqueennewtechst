# Profile Data Fix

## Issue
If you created your profile before we added the `fundingType` field, you'll get errors when loading opportunities.

## Quick Fix

### Option 1: Re-onboard (Easiest)
1. Go to `/profile` page
2. Select your funding types
3. Click "Save Changes"

### Option 2: Manually Update Firestore
1. Go to Firebase Console → Firestore
2. Navigate to `profiles/{your-uid}`
3. Add/Edit the field:
   - **Field:** `fundingType`
   - **Type:** Array
   - **Value:** `["grants"]` or `["rfps"]` or `["contracts"]` (or multiple)

### Option 3: Delete and Start Over
1. Firebase Console → Firestore
2. Delete your profile document
3. Re-do onboarding

---

## What We Fixed in Code
Added a safety check in `useOpportunities.ts`:
- If `fundingType` is missing or empty → defaults to all types: `['grants', 'rfps', 'contracts']`
- This prevents the app from crashing while you update your profile

