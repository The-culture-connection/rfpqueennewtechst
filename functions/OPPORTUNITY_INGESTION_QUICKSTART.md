# Opportunity Ingestion - Quick Start

## ✅ What Was Created

1. **`functions/src/opportunityIngest.ts`** - Main ingestion logic
2. **`functions/src/index.ts`** - Updated to export new functions
3. **`functions/OPPORTUNITY_INGESTION_SETUP.md`** - Full documentation

## 🚀 Quick Setup (3 Steps)

### Step 1: Set Source Configuration

Set the `SOURCES_JSON` environment variable:

```bash
# Using Firebase Secret Manager (recommended for production)
firebase functions:secrets:set SOURCES_JSON

# Paste your JSON config when prompted
```

### Step 2: Example Config Format

```json
[
  {
    "source": "grantsGov",
    "endpointUrl": "https://api.example.com/opportunities",
    "auth": {
      "type": "apiKey",
      "queryParam": "api_key",
      "token": "your-token"
    }
  }
]
```

### Step 3: Deploy

```bash
cd functions
npm run build
firebase deploy --only functions:ingestOpportunitiesDaily,functions:ingestOpportunitiesNow
```

## 📋 Functions Created

### 1. `ingestOpportunitiesDaily` (Scheduled)
- **Schedule**: Daily at 3:15 AM America/New_York
- **Auto-runs**: Yes
- **Timeout**: 9 minutes
- **Memory**: 1GB

### 2. `ingestOpportunitiesNow` (Callable)
- **Trigger**: Manual (admin-only)
- **Auth**: Requires `admin: true` custom claim
- **Timeout**: 9 minutes
- **Memory**: 1GB

## 🔍 How It Works

1. **Fetches** opportunities from all configured sources
2. **Normalizes** each record into canonical schema
3. **Upserts** to `Opportunity CRM` collection
4. **Preserves** `ingestedAt` timestamp (only set on creation)
5. **Skips** unchanged records (by `rawHash` comparison)
6. **Logs** failures to `Ingestion Logs` collection

## 📊 Firestore Collections

- **`Opportunity CRM`** - Normalized opportunities
- **`Ingestion Logs`** - Failure logs

## 🧪 Testing

### Manual Trigger (Admin Only)

```typescript
// Set admin claim first
import { getAuth } from 'firebase-admin/auth';
await getAuth().setCustomUserClaims(uid, { admin: true });

// Then call from client
import { getFunctions, httpsCallable } from 'firebase/functions';
const functions = getFunctions();
const ingestNow = httpsCallable(functions, 'ingestOpportunitiesNow');
const result = await ingestNow();
```

### Check Results

```typescript
// Query opportunities
const opps = await db.collection('Opportunity CRM')
  .where('source', '==', 'grantsGov')
  .limit(10)
  .get();

// Check logs
const logs = await db.collection('Ingestion Logs')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get();
```

## 🔧 Customization

### Adding Field Mappings

Edit `functions/src/opportunityIngest.ts` → `normalizeOpportunity()` function:

```typescript
// Add your custom field name
const title = String(
  raw?.title ?? 
  raw?.name ?? 
  raw?.myCustomTitle ?? // Add here
  'Untitled'
);
```

### Adding New Sources

Just add to `SOURCES_JSON` config - no code changes needed if field names match!

## 📚 Full Documentation

See `OPPORTUNITY_INGESTION_SETUP.md` for:
- Complete field mapping reference
- API response format examples
- Authentication options
- Troubleshooting guide
- Best practices

## ⚠️ Important Notes

1. **Secrets**: Use Firebase Secret Manager for API keys (never hardcode)
2. **Idempotency**: Safe to run multiple times (won't duplicate)
3. **Rate Limits**: Be aware of your API rate limits
4. **Field Names**: Update mappings if your API uses different field names
5. **Admin Claim**: Set `admin: true` custom claim for manual trigger

## 🐛 Troubleshooting

**No sources configured?**
→ Set `SOURCES_JSON` environment variable

**Authentication errors?**
→ Check API tokens and auth type

**Empty fields?**
→ Update field mappings in `normalizeOpportunity()`

**Timeout errors?**
→ Reduce number of sources or increase timeout

**Check logs:**
```bash
firebase functions:log --only ingestOpportunitiesDaily
```
