# Get Firebase Service Account Credentials

## Steps:

1. **Go to Firebase Console:**
   https://console.firebase.google.com/project/therfpqueen-f11fd/settings/serviceaccounts/adminsdk

2. **Generate New Private Key:**
   - Click "Generate new private key"
   - Click "Generate key"
   - A JSON file will download

3. **Open the JSON file** - it will look like:

```json
{
  "type": "service_account",
  "project_id": "therfpqueen-f11fd",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@therfpqueen-f11fd.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

4. **Add to `.env.local` file** (in webapp folder):

```env
# Add these lines to your existing .env.local:
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@therfpqueen-f11fd.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

**Important:**
- Copy the FULL private key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Keep the `\n` characters in the private key
- Use double quotes around the value
- **NEVER commit this file to Git** (it's already in .gitignore)

5. **Restart your dev server:**
```bash
# Stop server (Ctrl+C)
# Start again:
npm run dev
```

---

## Security Notes:

⚠️ **Keep this file secure!**
- Never commit service account keys to Git
- Never share them publicly
- Regenerate immediately if compromised

The `.env.local` file is already in `.gitignore`, so it won't be committed.

