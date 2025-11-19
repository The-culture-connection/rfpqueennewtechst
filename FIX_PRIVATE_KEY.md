# Fix Private Key Formatting Issue

## The Problem:
The private key format in `.env.local` is incorrect, causing parsing errors.

---

## ✅ Correct Format for `.env.local`:

### Option 1: Single-line with \n (Recommended)

When you copy the private key from the JSON file, it will have actual newlines. You need to replace them with `\n`:

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n...your key...\n-----END PRIVATE KEY-----\n"
```

**How to format:**
1. Open the downloaded service account JSON file
2. Find the `private_key` field
3. Copy the ENTIRE value (including `-----BEGIN...` and `-----END...`)
4. The key should have `\n` characters in it (literal backslash-n)
5. Paste it into `.env.local` with double quotes

---

## 🔍 Example (Shortened):

**Your JSON file has:**
```json
{
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhki...\n-----END PRIVATE KEY-----\n"
}
```

**Your `.env.local` should have:**
```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhki...\n-----END PRIVATE KEY-----\n"
```

---

## ⚠️ Common Mistakes:

### ❌ DON'T do this (actual newlines):
```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhki...
-----END PRIVATE KEY-----
"
```

### ❌ DON'T do this (missing quotes):
```env
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvg...
```

### ❌ DON'T do this (extra spaces):
```env
FIREBASE_PRIVATE_KEY= "-----BEGIN PRIVATE KEY-----\n...
```

### ✅ DO this (single line with \n):
```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhki...\n-----END PRIVATE KEY-----\n"
```

---

## 📝 Full `.env.local` Example:

```env
# Existing Firebase config (don't change these)
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="therfpqueen-f11fd.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="therfpqueen-f11fd"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="therfpqueen-f11fd.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="your-measurement-id"

# NEW: Add these for Admin SDK
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@therfpqueen-f11fd.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n...rest of your key...\n-----END PRIVATE KEY-----\n"
```

---

## 🚀 After Fixing:

1. **Save `.env.local`**
2. **Restart dev server:**
   ```bash
   # Stop (Ctrl+C)
   npm run dev
   ```
3. **Try uploading a document again**

---

## 🔍 How to Verify It's Correct:

The private key in your `.env.local` should:
- ✅ Start with `"`
- ✅ Have `-----BEGIN PRIVATE KEY-----\n`
- ✅ Have `\n` characters (literal backslash-n)
- ✅ End with `-----END PRIVATE KEY-----\n"`
- ✅ Be all on ONE line
- ✅ Have NO actual line breaks (newlines)

---

## 💡 Pro Tip:

If you're still having issues, you can test if the key is valid by checking if it starts correctly:

```bash
# In your terminal (from webapp folder):
node -e "console.log(process.env.FIREBASE_PRIVATE_KEY?.substring(0, 50))"
```

Should output:
```
"-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqh
```

If it shows `undefined` or looks different, the format is wrong.

