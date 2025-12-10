# Environment Variables Setup Guide

## .env.local File Format

Make sure your `.env.local` file is in the root of your project (`webapp/.env.local`) and follows this format:

```bash
# Simpler.Grants.gov API
SIMPLER_GRANTS_API_KEY=v08sW5JXAlwXZoWji30tMYkOc

# SAM.gov API
SAM_GOV_API_KEY=your_sam_gov_api_key_here

# Google Custom Search API
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
```

## Important Notes

1. **No spaces around the `=` sign** - Use `KEY=value` not `KEY = value`
2. **No quotes needed** - Unless your value contains spaces or special characters
3. **No trailing spaces** - Make sure there are no spaces at the end of lines
4. **One variable per line** - Don't put multiple variables on one line

## Example .env.local File

```bash
# API Keys for Opportunities Integration
SIMPLER_GRANTS_API_KEY=v08sW5JXAlwXZoWji30tMYkOc
SAM_GOV_API_KEY=SAM-ddb13bbd-7430-4ae4-9d0a-46de996f6d3d
GOOGLE_API_KEY=AIzaSyCz4scHPugLYKHg598rWOwMgdYg6Zuvfss
GOOGLE_SEARCH_ENGINE_ID=e5f496245fcd04441
```

## Verifying Environment Variables

After adding your environment variables:

1. **Restart your development server** - Environment variables are only loaded when the server starts
   ```bash
   # Stop the server (Ctrl+C) and restart
   npm run dev
   ```

2. **Check the server logs** - When you make an API call, check the console for:
   - "Fetching from Grants.gov..."
   - "Fetching from Simpler.Grants.gov..."
   - "Fetching from SAM.gov..."
   - "Fetching from Google Custom Search..."

3. **Test the API endpoint**:
   ```bash
   # In your browser or using curl
   http://localhost:3000/api/opportunities?limit=10
   ```

4. **Visit the test page**:
   ```
   http://localhost:3000/test-opportunities
   ```

## Troubleshooting

### Environment variables not working?

1. **Check file location**: `.env.local` must be in the `webapp/` directory (project root)
2. **Check file name**: Must be exactly `.env.local` (not `.env`, `.env.local.txt`, etc.)
3. **Restart server**: Environment variables are only loaded on server start
4. **Check for typos**: Variable names are case-sensitive
5. **Check for hidden characters**: Make sure there are no invisible characters or BOM markers

### Still not working?

Create a test API route to verify environment variables are being read:

```typescript
// src/app/api/test-env/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    SIMPLER_GRANTS_API_KEY: process.env.SIMPLER_GRANTS_API_KEY ? 'SET' : 'MISSING',
    SAM_GOV_API_KEY: process.env.SAM_GOV_API_KEY ? 'SET' : 'MISSING',
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? 'SET' : 'MISSING',
    GOOGLE_SEARCH_ENGINE_ID: process.env.GOOGLE_SEARCH_ENGINE_ID ? 'SET' : 'MISSING',
  });
}
```

Then visit: `http://localhost:3000/api/test-env`

**Note**: This will show if the variables are set, but NOT their actual values (for security).

## For Production Deployment

When deploying to production (Vercel, Railway, etc.), you'll need to add these environment variables in your deployment platform's settings:

- **Vercel**: Settings → Environment Variables
- **Railway**: Variables tab
- **Render**: Environment section

Make sure to add them for all environments (Production, Preview, Development).


