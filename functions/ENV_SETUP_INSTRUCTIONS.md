# Environment Variable Setup for Opportunity Ingestion

## Quick Answer

**For local development**: Yes, you can paste into `.env` file, but it needs to be on a **single line** (no line breaks).

**For production**: Use Firebase Secret Manager (recommended) or Firebase Functions config.

---

## Option 1: Local Development (.env file)

### Step 1: Create `.env` file

Create `functions/.env` file:

```bash
cd functions
touch .env  # or create .env file manually
```

### Step 2: Add SOURCES_JSON (Single Line)

**Important**: The JSON must be on a **single line** with no line breaks:

```bash
SOURCES_JSON=[{"source":"grantsGov","endpointUrl":"https://api.example.com/opportunities","auth":{"type":"apiKey","queryParam":"api_key","token":"your-token-here"}}]
```

### Step 3: Format for Multiple Sources

If you have multiple sources, still keep it on one line:

```bash
SOURCES_JSON=[{"source":"grantsGov","endpointUrl":"https://api.example.com/opportunities","auth":{"type":"apiKey","queryParam":"api_key","token":"token1"}},{"source":"simplerGrants","endpointUrl":"https://api.simpler.grants.gov/opportunities","auth":{"type":"bearer","token":"token2"}}]
```

### Step 4: Test Locally

The Firebase emulator will automatically read `.env` file:

```bash
cd functions
npm run serve
```

---

## Option 2: Production (Firebase Secret Manager) - RECOMMENDED

### Step 1: Prepare Your JSON

Format your JSON nicely first (for readability):

```json
[
  {
    "source": "grantsGov",
    "endpointUrl": "https://api.example.com/opportunities",
    "auth": {
      "type": "apiKey",
      "queryParam": "api_key",
      "token": "your-token-here"
    }
  },
  {
    "source": "simplerGrants",
    "endpointUrl": "https://api.simpler.grants.gov/opportunities",
    "auth": {
      "type": "bearer",
      "token": "your-bearer-token"
    }
  }
]
```

### Step 2: Set Secret

```bash
# Option A: Interactive (recommended)
firebase functions:secrets:set SOURCES_JSON

# When prompted, paste your JSON (can be multi-line)
# Press Ctrl+D (or Ctrl+Z on Windows) when done
```

Or save to a file and pipe it:

```bash
# Option B: From file
firebase functions:secrets:set SOURCES_JSON < sources.json
```

### Step 3: Update Function to Use Secret

The function needs to be updated to access the secret. Update `functions/src/opportunityIngest.ts`:

```typescript
// Add this import at the top
import { defineSecret } from 'firebase-functions/params';

// Define the secret
const sourcesJsonSecret = defineSecret('SOURCES_JSON');

// Update getSources function
function getSources(): SourceConfig[] {
  // Try secret first, then env var
  const raw = sourcesJsonSecret.value() || process.env.SOURCES_JSON;
  if (!raw) {
    logger.warn('SOURCES_JSON not configured');
    return [];
  }
  try {
    return JSON.parse(raw) as SourceConfig[];
  } catch (error) {
    logger.error('Failed to parse SOURCES_JSON', error);
    return [];
  }
}

// Update function exports to include secret
export const ingestOpportunitiesDaily = onSchedule(
  {
    schedule: '15 3 * * *',
    timeZone: 'America/New_York',
    retryCount: 1,
    memory: '1GiB',
    timeoutSeconds: 540,
    secrets: [sourcesJsonSecret], // Add this
  },
  async () => {
    // ...
  }
);

export const ingestOpportunitiesNow = onCall(
  {
    timeoutSeconds: 540,
    memory: '1GiB',
    secrets: [sourcesJsonSecret], // Add this
  },
  async (req) => {
    // ...
  }
);
```

---

## Option 3: Firebase Functions Config (Alternative)

For simpler setup without Secret Manager:

```bash
# Set config (JSON must be escaped)
firebase functions:config:set sources.json='[{"source":"grantsGov",...}]'

# Or set from file
firebase functions:config:set sources.json="$(cat sources.json)"
```

Then update code to read from config:

```typescript
import * as functions from 'firebase-functions';

function getSources(): SourceConfig[] {
  const raw = functions.config().sources?.json || process.env.SOURCES_JSON;
  // ...
}
```

**Note**: Functions config is being deprecated in favor of Secret Manager.

---

## Quick Setup (Simplest for Now)

### For Local Testing:

1. Create `functions/.env`:
```bash
SOURCES_JSON=[{"source":"grantsGov","endpointUrl":"https://api.example.com/opportunities","auth":{"type":"apiKey","queryParam":"api_key","token":"your-token"}}]
```

2. Run emulator:
```bash
cd functions
npm run serve
```

### For Production:

1. Set as environment variable in Firebase Console:
   - Go to Firebase Console → Functions → Configuration
   - Add environment variable: `SOURCES_JSON`
   - Paste your JSON (single line)

2. Or use Secret Manager (more secure for tokens):
```bash
firebase functions:secrets:set SOURCES_JSON
# Paste JSON when prompted
```

---

## Example .env File

```bash
# functions/.env
SOURCES_JSON=[{"source":"grantsGov","endpointUrl":"https://api.grants.gov/v1/opportunities","auth":{"type":"apiKey","queryParam":"api_key","token":"abc123"}},{"source":"simplerGrants","endpointUrl":"https://api.simpler.grants.gov/opportunities","auth":{"type":"bearer","token":"xyz789"}}]
```

---

## Troubleshooting

### "No sources configured" error?

- Check `.env` file exists in `functions/` directory
- Verify JSON is valid (test with `JSON.parse()`)
- Ensure it's on a single line
- Check for typos in variable name: `SOURCES_JSON` (not `SOURCES_CONFIG`)

### JSON parsing errors?

- Validate your JSON: https://jsonlint.com/
- Remove all line breaks
- Escape quotes properly
- Check for trailing commas

### Secret Manager not working?

- Ensure you've added `secrets: [sourcesJsonSecret]` to function config
- Redeploy after setting secret
- Check secret is accessible: `firebase functions:secrets:access SOURCES_JSON`

---

## Security Best Practices

1. **Never commit `.env` to git** - Add to `.gitignore`
2. **Use Secret Manager for production** - More secure than config
3. **Rotate tokens regularly** - Update secrets when tokens expire
4. **Limit access** - Only admins should access secrets
