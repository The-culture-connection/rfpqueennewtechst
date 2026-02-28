# Opportunity Ingestion System Setup Guide

## Overview

The Opportunity Ingestion System automatically fetches opportunities from multiple API endpoints, normalizes them into a canonical schema, and stores them in the `Opportunity CRM` Firestore collection.

## Features

- **Multi-source support**: Configure multiple API endpoints
- **Automatic normalization**: Maps various API formats to a canonical schema
- **Smart upsert logic**: Preserves `ingestedAt` timestamp, skips unchanged records
- **Pagination support**: Handles multiple pagination formats automatically
- **Retry logic**: Exponential backoff for failed requests
- **Batch processing**: Efficient Firestore writes (up to 500 per batch)
- **Failure logging**: Errors logged to `Ingestion Logs` collection
- **Scheduled ingestion**: Daily at 3:15 AM ET
- **Manual trigger**: Admin-only callable function

## Setup

### 1. Configure Sources

Set the `SOURCES_JSON` environment variable with your source configurations:

```bash
# Using Firebase Secret Manager (recommended)
firebase functions:secrets:set SOURCES_JSON

# Or set in .env file for local development
echo 'SOURCES_JSON=[...]' >> .env
```

### 2. Example Configuration

```json
[
  {
    "source": "grantsGov",
    "endpointUrl": "https://api.grants.gov/v1/opportunities",
    "auth": {
      "type": "apiKey",
      "queryParam": "api_key",
      "token": "your-api-key-here"
    }
  },
  {
    "source": "simplerGrants",
    "endpointUrl": "https://api.simpler.grants.gov/opportunities",
    "auth": {
      "type": "bearer",
      "token": "your-bearer-token-here"
    }
  },
  {
    "source": "samGov",
    "endpointUrl": "https://api.sam.gov/opportunities",
    "auth": {
      "type": "apiKey",
      "headerName": "X-API-Key",
      "token": "your-api-key-here"
    }
  },
  {
    "source": "publicAPI",
    "endpointUrl": "https://api.example.com/public/opportunities",
    "auth": {
      "type": "none"
    }
  }
]
```

### 3. Authentication Types

#### Bearer Token
```json
{
  "type": "bearer",
  "token": "your-token"
}
```
Adds `Authorization: Bearer <token>` header.

#### API Key (Header)
```json
{
  "type": "apiKey",
  "headerName": "X-API-Key",
  "token": "your-key"
}
```
Adds custom header with API key.

#### API Key (Query Parameter)
```json
{
  "type": "apiKey",
  "queryParam": "api_key",
  "token": "your-key"
}
```
Adds API key as query parameter.

#### No Authentication
```json
{
  "type": "none"
}
```
Or omit the `auth` field entirely.

## API Response Formats

The system supports multiple response formats:

### Plain Array
```json
[
  { "id": "1", "title": "Opportunity 1" },
  { "id": "2", "title": "Opportunity 2" }
]
```

### Object with `items`
```json
{
  "items": [
    { "id": "1", "title": "Opportunity 1" }
  ],
  "nextPageToken": "abc123"
}
```

### Object with `data`
```json
{
  "data": [
    { "id": "1", "title": "Opportunity 1" }
  ],
  "next": "https://api.example.com/opportunities?page=2"
}
```

### Object with `results`
```json
{
  "results": [
    { "id": "1", "title": "Opportunity 1" }
  ],
  "pagination": {
    "next": "https://api.example.com/opportunities?page=2"
  }
}
```

## Field Mapping

The `normalizeOpportunity()` function maps your API fields to the canonical schema. Common field name variations are already handled, but you may need to add source-specific mappings.

### Current Field Mappings

| Canonical Field | Source Field Variations |
|----------------|------------------------|
| `source_opportunity_id` | `id`, `opportunityId`, `opportunity_id`, `noticeId`, `grantNumber` |
| `type` | `type`, `opportunityType`, `category` |
| `title` | `title`, `name`, `opportunityTitle` |
| `description` | `description`, `summary`, `details`, `abstract` |
| `deadline_yyyy_mm_dd` | `deadline`, `closeDate`, `dueDate`, `applicationDeadline`, `closingDate` |
| `amount_min` | `amount_min`, `amountMin`, `minAward`, `awardMin`, `minAmount` |
| `amount_max` | `amount_max`, `amountMax`, `maxAward`, `awardMax`, `maxAmount` |
| `currency` | `currency`, `awardCurrency` |
| `geographies` | `geographies`, `geography`, `eligibleLocations`, `location` |
| `org_types` | `org_types`, `orgTypes`, `eligibleOrgTypes`, `organizationTypes` |
| `stages` | `stages`, `stage`, `eligibleStages`, `companyStages` |
| `industry_tags` | `industry_tags`, `industryTags`, `industries`, `sectors` |
| `use_of_funds_tags` | `use_of_funds_tags`, `useOfFundsTags`, `allowableUses`, `fundingPurposes` |
| `requirements` | `requirements`, `requiredDocuments`, `applicationRequirements`, `eligibilityRequirements` |
| `source_url` | `source_url`, `url`, `link`, `opportunityUrl` |
| `effort_level` | `effort_level`, `effortLevel`, `applicationEffort` |

### Adding Custom Field Mappings

Edit `functions/src/opportunityIngest.ts` and update the `normalizeOpportunity()` function:

```typescript
// Example: Add custom field mapping for "MySource"
const title = String(
  raw?.title ?? 
  raw?.name ?? 
  raw?.opportunityTitle ?? 
  raw?.mySourceTitle ?? // Add your custom field
  'Untitled'
);
```

## Firestore Schema

### Collection: `Opportunity CRM`

Each document has the following structure:

```typescript
{
  id: string; // Document ID (also in field)
  type: string;
  title: string;
  description: string;
  deadline_yyyy_mm_dd: string; // YYYY-MM-DD or ""
  amount_min: number;
  amount_max: number;
  currency: string;
  status: string;
  geographies: string; // Pipe-delimited: "US|US-OH"
  org_types: string; // Pipe-delimited: "for_profit|startup"
  stages: string; // Pipe-delimited: "mvp|revenue"
  industry_tags: string; // Pipe-delimited: "health|ai"
  use_of_funds_tags: string; // Pipe-delimited
  requirements: string; // Pipe-delimited
  source: string;
  source_url: string;
  effort_level: string;
  source_opportunity_id: string | null;
  lastSeenAt: Timestamp; // Always updated
  ingestedAt: Timestamp; // Only set on creation
  rawHash: string; // SHA256 of raw payload
  searchText: string; // Lowercased searchable text
}
```

### Collection: `Ingestion Logs`

Failure logs are stored here:

```typescript
{
  source: string;
  createdAt: Timestamp;
  message: string;
  stack: string;
}
```

## Usage

### Scheduled Ingestion

Runs automatically daily at **3:15 AM America/New_York**.

### Manual Ingestion

Call the `ingestOpportunitiesNow` function (admin-only):

```typescript
// From client (with admin auth)
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const ingestNow = httpsCallable(functions, 'ingestOpportunitiesNow');

const result = await ingestNow();
console.log(result.data);
// { totalFetched: 150, totalUpserted: 120, totalSkipped: 30 }
```

### Setting Admin Custom Claim

To allow manual ingestion, set the `admin` custom claim:

```typescript
// From Firebase Admin SDK
import { getAuth } from 'firebase-admin/auth';

await getAuth().setCustomUserClaims(uid, { admin: true });
```

## Monitoring

### Check Logs

```bash
firebase functions:log --only ingestOpportunitiesDaily
firebase functions:log --only ingestOpportunitiesNow
```

### Check Firestore

```typescript
// Query opportunities
const opps = await db.collection('Opportunity CRM')
  .where('source', '==', 'grantsGov')
  .where('status', '==', 'open')
  .limit(10)
  .get();

// Check ingestion logs
const logs = await db.collection('Ingestion Logs')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get();
```

## Troubleshooting

### No Sources Configured

**Error**: `No sources configured. Set SOURCES_JSON env var.`

**Solution**: Set the `SOURCES_JSON` environment variable with your source configurations.

### Authentication Failures

**Error**: `HTTP 401` or `HTTP 403` in logs

**Solution**: 
- Verify your API tokens are correct
- Check token expiration
- Ensure authentication type matches your API requirements

### Pagination Issues

**Symptom**: Only first page of results ingested

**Solution**: 
- Verify your API's pagination format matches supported formats
- Check for `nextPageToken`, `next`, or `pagination.next` fields
- Add custom pagination logic if needed

### Field Mapping Issues

**Symptom**: Fields are empty or incorrect

**Solution**: 
- Check your API response structure
- Update field mappings in `normalizeOpportunity()`
- Add source-specific field name variations

### Performance Issues

**Symptom**: Function timeout or slow ingestion

**Solution**:
- Reduce number of sources per run
- Optimize API response size
- Check Firestore write quotas
- Increase function timeout if needed

## Best Practices

1. **Use Secret Manager**: Store API keys in Firebase Secret Manager, not in code
2. **Test Field Mappings**: Test with a small dataset first
3. **Monitor Logs**: Regularly check `Ingestion Logs` for failures
4. **Idempotency**: The system is idempotent - safe to run multiple times
5. **Rate Limiting**: Be aware of API rate limits
6. **Data Quality**: Validate your source data before ingestion

## Adding New Sources

1. **Add to Config**: Add source configuration to `SOURCES_JSON`
2. **Test API**: Verify API response format
3. **Update Mappings**: Add field mappings if needed (see Field Mapping section)
4. **Deploy**: Deploy functions and test
5. **Monitor**: Check logs and Firestore for successful ingestion

No code changes needed if your API matches existing field name patterns!
