# Create Webhook Integration in Firestore

After starting the local webhook receiver and exposing it with ngrok, create an integration document in Firestore.

## Steps

### 1. Get your ngrok URL
After running `ngrok http 3000`, copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### 2. Create Integration Document

Go to Firebase Console → Firestore Database and create a new document:

**Collection:** `integrations`  
**Document ID:** (auto-generate or use a custom ID like `local-test`)

**Document Data:**
```json
{
  "name": "Local Test Integration",
  "webhookUrl": "https://YOUR-NGROK-URL.ngrok.io/webhook",
  "secret": "test-secret-change-me",
  "enabledEvents": [
    "user.created",
    "document.uploaded",
    "opportunity.saved",
    "opportunity.applied",
    "opportunities.recommended",
    "opportunity.analyzed"
  ],
  "isActive": true,
  "createdAt": "2025-02-03T00:00:00Z",
  "updatedAt": "2025-02-03T00:00:00Z"
}
```

**Important:** Replace `YOUR-NGROK-URL` with your actual ngrok URL!

### 3. Using Firebase CLI (Alternative)

You can also create it via command line:

```powershell
# Set your ngrok URL
$ngrokUrl = "https://abc123.ngrok.io"  # Replace with your ngrok URL

# Create integration document
firebase firestore:set integrations/local-test `
  "name=Local Test Integration" `
  "webhookUrl=$ngrokUrl/webhook" `
  "secret=test-secret-change-me" `
  "enabledEvents=[user.created,document.uploaded,opportunity.saved,opportunity.applied,opportunities.recommended,opportunity.analyzed]" `
  "isActive=true" `
  "createdAt=$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')"
```

### 4. Using Node.js Script

Create a file `create-integration.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createIntegration() {
  const ngrokUrl = 'https://YOUR-NGROK-URL.ngrok.io'; // Replace!
  
  const integration = {
    name: 'Local Test Integration',
    webhookUrl: `${ngrokUrl}/webhook`,
    secret: 'test-secret-change-me',
    enabledEvents: [
      'user.created',
      'document.uploaded',
      'opportunity.saved',
      'opportunity.applied',
      'opportunities.recommended',
      'opportunity.analyzed'
    ],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await db.collection('integrations').doc('local-test').set(integration);
  console.log('✅ Integration created!');
  console.log('ID: local-test');
  console.log(`Webhook URL: ${integration.webhookUrl}`);
}

createIntegration().catch(console.error);
```

## Verify Integration

After creating the integration:

1. Check Firestore Console → `integrations` collection
2. Verify `isActive: true`
3. Verify `webhookUrl` matches your ngrok URL
4. Verify `secret` matches the one in your local receiver (default: `test-secret-change-me`)

## Testing

Once the integration is created, trigger a webhook event:

1. **Test user.created:**
   - Create a new user profile in Firestore: `profiles/{userId}`
   - Check your local receiver logs

2. **Test document.uploaded:**
   - Upload a document and set `processingStatus: 'completed'`
   - Check your local receiver logs

3. **Test opportunity.saved:**
   - Add an opportunity to `profiles/{userId}/tracker/saved`
   - Check your local receiver logs

## Troubleshooting

### Webhook not receiving events

1. Check integration `isActive` is `true`
2. Verify `webhookUrl` is correct (includes `/webhook` path)
3. Check ngrok is still running
4. Verify event type is in `enabledEvents` array
5. Check Firebase Functions logs: `firebase functions:log`

### Signature verification fails

- Ensure `secret` in Firestore matches the one in your local receiver
- Default secret: `test-secret-change-me`

### ngrok URL changed

- Update the `webhookUrl` in Firestore when ngrok restarts
- ngrok free tier gives you a new URL each time
