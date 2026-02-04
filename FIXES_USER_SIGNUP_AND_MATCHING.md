# Fixes: User Signup Event & Opportunity Matching

## Issues Fixed

### 1. User Signup Event Not Being Recorded ✅

**Problem:** The `onUserCreated` webhook was not firing when users signed up because:
- `updateUserProfile` was using `setDoc(..., { merge: true })` which triggers `onDocumentUpdated` instead of `onDocumentCreated`
- `createdAt` was not being set as a Firestore Timestamp

**Solution:**
- Modified `updateUserProfile` in `src/components/AuthProvider.tsx` to:
  - Check if profile exists before writing
  - Use `setDoc` WITHOUT merge for new profiles (triggers `onDocumentCreated`)
  - Use `setDoc` WITH merge for existing profiles (triggers `onDocumentUpdated`)
  - Set `createdAt` as a Firestore `Timestamp` for new profiles
  - Preserve existing `createdAt` when updating

**Changes:**
```typescript
// Before: Always used merge
await setDoc(profileRef, updatedProfile, { merge: true });

// After: Conditional based on existence
if (isNewProfile) {
  updatedProfile.createdAt = Timestamp.now();
  await setDoc(profileRef, updatedProfile); // No merge = onCreate trigger
} else {
  await setDoc(profileRef, updatedProfile, { merge: true }); // Merge = onUpdate trigger
}
```

**Result:** New user profiles now trigger the `onUserCreated` webhook correctly.

---

### 2. Opportunity Matcher Returning 0 Results ✅

**Problem:** The matcher was returning 0 eligible matches because:
- Opportunities missing `applicantTypes` and `eligibleEntities` were immediately marked as "unknown"
- The algorithm returned early without checking description text for entity type mentions
- All opportunities ended up in the "unknown" bucket instead of "eligible"

**Solution:**
- Modified `evaluateEligibility` in `src/lib/productionMatchAlgorithm.ts` to:
  - Check description/title for entity type mentions even when arrays are empty
  - Allow opportunities to be "eligible" if description suggests compatibility
  - Only mark as "unknown" if both arrays are empty AND description doesn't indicate compatibility
  - Use a slightly lower eligibility score (0.7 vs 1.0) when entity type is inferred from description

**Changes:**
```typescript
// Before: Returned "unknown" immediately if arrays empty
if (allOppTypes.length === 0) {
  return { status: 'unknown', ... };
}

// After: Check description first, then decide
if (allOppTypes.length === 0) {
  if (entityMatch && entityMatchSource === 'description') {
    // Allow as eligible with note about missing data
    blockers.push('missing_applicant_types', 'missing_eligible_entities');
    reasons.push('Entity type data missing from API, but description suggests compatibility');
    eligibilityScore = 0.7;
    // Continue - don't return early
  } else {
    // No match found - mark as unknown
    return { status: 'unknown', ... };
  }
}
```

**Result:** Opportunities with missing entity type data but compatible descriptions now appear as "eligible" matches instead of being hidden in the "unknown" bucket.

---

## Testing

### Test User Signup:
1. Create a new user account
2. Check Firebase Console → Firestore → `profiles/{userId}`
3. Verify `createdAt` field exists as a Timestamp
4. Check webhook logs - should see `user.created` event

### Test Opportunity Matching:
1. Run matching for a user with profile
2. Check logs - should see opportunities marked as "eligible" even if `applicantTypes`/`eligibleEntities` are missing
3. Dashboard should show opportunities in "Eligible Matches" section
4. Opportunities with description-based entity type matches should have a note about missing API data

---

## Files Modified

1. `src/components/AuthProvider.tsx`
   - Added `Timestamp` import from `firebase/firestore`
   - Modified `updateUserProfile` to handle new vs existing profiles differently
   - Set `createdAt` as Timestamp for new profiles

2. `src/lib/productionMatchAlgorithm.ts`
   - Modified `evaluateEligibility` to check description even when entity type arrays are empty
   - Allow "eligible" status when description suggests compatibility
   - Improved entity type matching logic
