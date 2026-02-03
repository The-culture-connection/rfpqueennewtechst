# Webhook System - Migration Notes

## Important: Preserving Existing Functions

The webhook system is added to `functions/src/index.ts`. The existing functions (samGov, grantsGov, matchOpportunities, etc.) are currently in `functions/lib/index.js` (compiled JavaScript).

### Option 1: Merge Existing Functions (Recommended)

If you have the TypeScript source for existing functions, merge them into `functions/src/index.ts`:

1. Copy existing function exports from your source files
2. Add them to `functions/src/index.ts`
3. Build: `npm run build`
4. Deploy: `firebase deploy --only functions`

### Option 2: Keep Separate Entry Points

If you want to keep existing functions separate:

1. Create `functions/src/webhooks.ts` with only webhook triggers
2. Keep existing `lib/index.js` as-is
3. Update `package.json` main field or use multiple entry points
4. Deploy both

### Option 3: Import from Compiled (Temporary)

If you need to preserve existing functions immediately:

1. The compiled `lib/index.js` will still work
2. Add webhook functions to a separate file
3. Import and re-export in main index

## Current Implementation

The webhook system in `functions/src/index.ts` includes:
- All webhook triggers (onUserCreated, onDocumentUploaded, etc.)
- Normalized recommendation persistence
- No existing function exports (they need to be added)

## Next Steps

1. **If you have TypeScript source for existing functions:**
   - Merge them into `functions/src/index.ts`
   - Re-export all existing functions
   - Build and deploy

2. **If you only have compiled JavaScript:**
   - Keep `lib/index.js` as-is
   - Create separate webhook entry point
   - Or manually convert JavaScript to TypeScript

3. **Test:**
   - Deploy functions
   - Verify existing functions still work
   - Test webhook triggers

## Webhook Functions Added

- `onUserCreated`
- `onDocumentUploaded`
- `onOpportunitySaved`
- `onOpportunityApplied`
- `onOpportunitiesRecommended`
- `onOpportunityAnalyzed`
- `persistRecommendations`

These are exported from `functions/src/index.ts` and will be available after build/deploy.
