# API Integration Setup Guide

This document explains how the opportunities system has been migrated from Firebase Storage to external APIs.

## Overview

The opportunities are now fetched from three main API sources:

1. **Grants.gov / Simpler.Grants.gov API** → Federal grants
2. **SAM.gov Public API** → Federal RFPs/contracts
3. **Google Custom Search API** → State/local grants, corporate opportunities, accelerators, investors

## Files Created/Modified

### New Files
- `src/lib/apiIntegrations.ts` - Contains all API integration functions
- `src/app/test-opportunities/page.tsx` - Test page to view all opportunities
- `API_INTEGRATION_SETUP.md` - This file

### Modified Files
- `src/app/api/opportunities/route.ts` - Updated to use API integrations instead of Firebase Storage

## API Integration Functions

### 1. Grants.gov API
- **Endpoint**: `https://api.grants.gov/v1/api/search2`
- **Method**: POST
- **Authentication**: None required
- **Function**: `fetchGrantsGovOpportunities()`

### 2. Simpler.Grants.gov API
- **Endpoint**: `https://api.simpler.grants.gov/v1/opportunities/search`
- **Method**: POST
- **Authentication**: X-API-Key header required
- **Function**: `fetchSimplerGrantsOpportunities()`
- **API Key**: `v08sW5JXAlwXZoWji30tMYkOc` (from API Documentation)

### 3. SAM.gov API
- **Endpoint**: `https://api.sam.gov/opportunities/v1/search`
- **Method**: GET
- **Authentication**: API key required
- **Function**: `fetchSAMGovOpportunities()`

### 4. Google Custom Search API
- **Endpoint**: `https://www.googleapis.com/customsearch/v1`
- **Method**: GET
- **Authentication**: API key and Search Engine ID required
- **Function**: `fetchGoogleCustomSearchOpportunities()`

## Environment Variables Required

Add these to your `.env.local` file or deployment environment:

```bash
# Simpler.Grants.gov API
SIMPLER_GRANTS_API_KEY=v08sW5JXAlwXZoWji30tMYkOc

# SAM.gov API (get from https://api.sam.gov/)
SAM_GOV_API_KEY=your_sam_gov_api_key_here

# Google Custom Search API
# You need to:
# 1. Create a Custom Search Engine at https://programmablesearchengine.google.com/
# 2. Get your API key from Google Cloud Console
# 3. Get your Search Engine ID (CX) from the Custom Search Engine settings
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
```

## Setting Up Google Custom Search API

1. **Create a Custom Search Engine**:
   - Go to https://programmablesearchengine.google.com/
   - Click "Add" to create a new search engine
   - Configure it to search the entire web or specific sites
   - Save and note your Search Engine ID (CX)

2. **Get Google API Key**:
   - Go to Google Cloud Console
   - Enable the Custom Search API
   - Create credentials (API Key)
   - Restrict the API key to Custom Search API only

3. **Set Environment Variables**:
   - Add `GOOGLE_API_KEY` with your API key
   - Add `GOOGLE_SEARCH_ENGINE_ID` with your Search Engine ID

## Testing the Integration

1. **Visit the Test Page**:
   - Navigate to `/test-opportunities` in your application
   - This page displays all opportunities from all APIs
   - You can search by keyword and adjust the limit

2. **Test API Endpoint Directly**:
   ```bash
   # Get all opportunities
   curl http://localhost:3000/api/opportunities?limit=50
   
   # Search with keyword
   curl http://localhost:3000/api/opportunities?keyword=education&limit=50
   
   # Filter by funding types
   curl http://localhost:3000/api/opportunities?fundingTypes=grants,rfps&limit=50
   ```

## API Response Format

The `/api/opportunities` endpoint returns:

```json
{
  "success": true,
  "count": 100,
  "opportunities": [...],
  "hasMore": false,
  "sources": {
    "grantsGov": 30,
    "simplerGrants": 25,
    "samGov": 20,
    "googleSearch": 25
  }
}
```

## Opportunity Data Structure

Each opportunity follows this structure:

```typescript
{
  id: string;
  source: string; // "Grants.gov", "Simpler.Grants.gov", "SAM.gov", or "Google Search (...)"
  title: string;
  agency: string;
  description: string;
  openDate: string | null;
  closeDate: string | null;
  deadline: string | null;
  city: string;
  state: string;
  contactEmail: string;
  url: string;
  amount: string;
  category: string;
  rfpNumber: string;
  type: "RFP" | "Grant";
}
```

## Notes

- The API integrations gracefully handle errors - if one API fails, others will still work
- Opportunities are deduplicated based on URL and title
- The system filters out opportunities without URLs
- Past deadlines are filtered out by default
- All APIs are called in parallel for better performance

## Troubleshooting

### No opportunities returned
1. Check that environment variables are set correctly
2. Verify API keys are valid and not expired
3. Check server logs for API errors
4. Ensure APIs are accessible from your server

### Google Custom Search not working
1. Verify the Custom Search Engine is set up correctly
2. Check that the API key has Custom Search API enabled
3. Ensure the Search Engine ID (CX) is correct
4. Check API quota limits in Google Cloud Console

### SAM.gov API not working
1. Verify you have a valid API key from https://api.sam.gov/
2. Check that the API key has the correct permissions
3. Verify the endpoint URL is correct

### Simpler.Grants.gov API not working
1. Verify the API key is correct: `v08sW5JXAlwXZoWji30tMYkOc`
2. Check the API endpoint is accessible
3. Review the API documentation for any changes

## Next Steps

1. Set up all required environment variables
2. Test the `/test-opportunities` page
3. Verify opportunities are being fetched correctly
4. Update any frontend code that depends on the old Firebase Storage structure (if needed)
5. Monitor API rate limits and adjust as needed


