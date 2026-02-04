# Resolve Merge Conflicts in useOpportunities.ts

## Quick Fix

Your local file has merge conflicts. Here's how to resolve them:

### Option 1: Accept Remote Version (Recommended)

```powershell
# Discard local changes and use the clean remote version
git checkout --theirs src/hooks/useOpportunities.ts
git add src/hooks/useOpportunities.ts
git commit -m "Resolve merge conflicts - accept remote version"
```

### Option 2: Manual Resolution

The conflicts are at these locations. Keep the version with `[MATCHING][CLIENT]` logging:

**Line 278-282:** Keep this version:
```typescript
console.log(`[MATCHING][CLIENT] Using opportunities directly from API response: ${runData.opportunities.length} eligible`);
matched = runData.opportunities;
```

**Line 288-292:** Keep this version:
```typescript
console.log(`[MATCHING][CLIENT] Using unknown opportunities from API response: ${runData.unknownOpportunities.length}`);
setUnknownEligibilityOpportunities(runData.unknownOpportunities);
```

**Line 301-357:** Keep the version with:
- `[MATCHING][CLIENT] API response had no opportunities, trying Firestore...`
- `[MATCHING][CLIENT] Firestore topMatches length:`
- `mappingFailures` tracking
- `[MATCHING][CLIENT] mapping failures` log

### Option 3: Pull and Merge

```powershell
git pull origin cursor/current-repository-context-498a
# If conflicts appear, use:
git checkout --theirs src/hooks/useOpportunities.ts
git add src/hooks/useOpportunities.ts
git commit -m "Resolve conflicts"
```

## What to Keep

Always keep the version with:
- `[MATCHING][CLIENT]` prefix in console logs
- `mappingFailures` tracking
- Direct API response usage (`matched = runData.opportunities`)

## Verify After Resolution

After resolving, the file should:
1. Use `runData.opportunities` directly (line ~279)
2. Have `[MATCHING][CLIENT]` logging format
3. Track mapping failures with `mappingFailures` counter
4. Have no `<<<<<<<`, `=======`, or `>>>>>>>` markers
