# How to Set SOURCES_JSON Secret Correctly

## The Problem

The logs show the secret only contains `[` instead of the complete JSON. This happens when:
1. Only the first character was pasted
2. The file wasn't read completely
3. There was an issue with the interactive input

## Solution: Set from File (Recommended)

### Step 1: Verify your JSON file is correct

```bash
cd functions
cat examplesources.json
```

Or in PowerShell:
```powershell
Get-Content examplesources.json
```

### Step 2: Set the secret from file

**Using PowerShell:**
```powershell
cd functions
Get-Content examplesources.json | firebase functions:secrets:set SOURCES_JSON
```

**Using Git Bash/WSL:**
```bash
cd functions
firebase functions:secrets:set SOURCES_JSON < examplesources.json
```

**Using interactive method (if file method doesn't work):**
```bash
cd functions
firebase functions:secrets:set SOURCES_JSON
# Then:
# 1. Open examplesources.json in a text editor
# 2. Select ALL (Ctrl+A)
# 3. Copy (Ctrl+C)
# 4. Paste into terminal (right-click or Ctrl+V)
# 5. Press Ctrl+Z then Enter (Windows) or Ctrl+D (Mac/Linux)
```

### Step 3: Verify the secret was set correctly

```bash
firebase functions:secrets:access SOURCES_JSON
```

You should see the complete JSON array, starting with `[` and ending with `]`, not just `[`.

### Step 4: Wait for propagation

After setting the secret, wait 1-2 minutes for it to propagate to running function instances.

### Step 5: Test again

```bash
curl https://ingestopportunitieshttp-mmmrt6wtlq-uc.a.run.app
```

You should now see your sources listed in `availableSources`.

## Troubleshooting

### If the secret still shows only `[`:

1. **Check file encoding**: Make sure `examplesources.json` is UTF-8
2. **Check file size**: Should be more than 1 byte
3. **Try deleting and recreating**:
   ```bash
   firebase functions:secrets:delete SOURCES_JSON
   firebase functions:secrets:set SOURCES_JSON < examplesources.json
   ```

### If you get "file not found":

Make sure you're in the `functions` directory:
```bash
cd C:\Users\grace\my-firebase-project\webapp\functions
```

### Alternative: Copy JSON directly

If file method doesn't work, you can copy the JSON directly:

1. Open `examplesources.json` in a text editor
2. Select all (Ctrl+A) and copy (Ctrl+C)
3. Run: `firebase functions:secrets:set SOURCES_JSON`
4. Paste the entire JSON
5. Press Ctrl+Z then Enter
