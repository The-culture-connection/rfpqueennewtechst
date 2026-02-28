# Firebase Secret Manager Commands for SOURCES_JSON

## Set the Secret

### Option 1: Interactive (Recommended)
```bash
firebase functions:secrets:set SOURCES_JSON
```
When prompted, paste your JSON (can be multi-line). Press `Ctrl+Z` then `Enter` on Windows (or `Ctrl+D` on Mac/Linux) when done.

### Option 2: From a File
```bash
# Save your JSON to a file first
firebase functions:secrets:set SOURCES_JSON < sources.json
```

### Option 3: From PowerShell (Windows)
```powershell
# Read JSON file and set secret
Get-Content sources.json | firebase functions:secrets:set SOURCES_JSON
```

---

## Get/View the Secret

### View Secret Value
```bash
firebase functions:secrets:access SOURCES_JSON
```

### List All Secrets
```bash
firebase functions:secrets:list
```

### Check if Secret Exists
```bash
firebase functions:secrets:get SOURCES_JSON
```

---

## Delete the Secret

```bash
firebase functions:secrets:delete SOURCES_JSON
```

---

## Example: Complete Workflow

1. **Prepare your JSON file** (`sources.json`):
```json
[
  {
    "source": "grantsGov",
    "endpointUrl": "https://api.grants.gov/v1/api/search2",
    "method": "POST",
    "auth": {
      "type": "none"
    },
    "requestBody": {
      "rows": 100,
      "keyword": "",
      "oppNum": "",
      "eligibilities": "",
      "agencies": "",
      "oppStatuses": "forecasted|posted",
      "aln": "",
      "fundingCategories": ""
    }
  }
]
```

2. **Set the secret**:
```bash
firebase functions:secrets:set SOURCES_JSON < sources.json
```

3. **Verify it was set**:
```bash
firebase functions:secrets:access SOURCES_JSON
```

4. **Redeploy your functions** (required after setting/updating secrets):
```bash
firebase deploy --only functions
```

---

## Important Notes

- **After setting a secret, you MUST redeploy** functions that use it
- Secrets are encrypted and stored securely in Google Cloud Secret Manager
- Secrets are accessible only to functions that explicitly declare them in their `secrets` array
- The secret value can be multi-line JSON (unlike environment variables)

---

## Troubleshooting

### "Secret not found" error?
- Make sure you've set the secret: `firebase functions:secrets:set SOURCES_JSON`
- Verify the secret name matches exactly: `SOURCES_JSON` (case-sensitive)
- Check that the function includes the secret in its `secrets` array

### "No value for the secret" during deployment?
- Set the secret before deploying: `firebase functions:secrets:set SOURCES_JSON`
- Or make the secret optional in your function code (check if it exists before using)

### Secret not accessible in function?
- Ensure the function's `secrets` array includes the secret
- Redeploy after setting the secret
- Check function logs for parsing errors
