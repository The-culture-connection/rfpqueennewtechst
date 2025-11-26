# Fix Root Directory Error

## The Problem

Vercel is looking for `webapp/webapp` because:
- Your project settings have **Root Directory** set to `webapp`
- But you're already deploying from the `webapp` folder
- So it tries to go to `webapp/webapp` which doesn't exist

## Solution: Update Root Directory in Vercel Dashboard

### Option 1: Remove Root Directory (Recommended)

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/the-culture-connections-projects/bootybutt-4x17/settings

2. **Update Root Directory:**
   - Go to **Settings** → **General**
   - Find **Root Directory** section
   - Click **Edit**
   - **Clear the field** (set it to blank/empty)
   - Click **Save**

3. **Redeploy:**
   ```bash
   cd webapp
   vercel --prod
   ```

### Option 2: Relink Project (Alternative)

If you can't access the dashboard, you can relink the project:

```bash
cd webapp
# Remove the old link
Remove-Item -Recurse -Force .vercel

# Relink without root directory
vercel link
# When prompted, don't set a root directory (leave blank)
```

## Why This Happens

- Your project structure: `my-firebase-project/webapp/`
- If Vercel project was created from the parent directory, it might have `webapp` as root
- But when deploying from `webapp` folder, root should be `.` (current directory)

## Quick Fix Command

After updating the dashboard, just run:
```bash
cd webapp
vercel --prod
```

The deployment should work now! 🎉

