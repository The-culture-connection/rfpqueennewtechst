import { NextResponse } from 'next/server';

// Debug endpoint to see raw API responses
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const api = searchParams.get('api'); // 'simpler', 'sam', or 'google'

  try {
    if (api === 'simpler') {
      const apiKey = process.env.SIMPLER_GRANTS_API_KEY || 'v08sW5JXAlwXZoWji30tMYkOc';
      const requestBody = {
        pagination: {
          page_offset: 1,
          page_size: 5,
          sort_order: [
            {
              order_by: "opportunity_id",
              sort_direction: "descending"
            }
          ]
        }
      };

      const response = await fetch('https://api.simpler.grants.gov/v1/opportunities/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      return NextResponse.json({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: data,
        dataKeys: Object.keys(data),
        dataString: JSON.stringify(data, null, 2),
      });
    } else if (api === 'sam') {
      const apiKey = process.env.SAM_GOV_API_KEY || '';
      if (!apiKey) {
        return NextResponse.json({ error: 'SAM.gov API key not set' }, { status: 400 });
      }

      // Try the standard endpoint
      const url = `https://api.sam.gov/prod/opportunities/v2/search?api_key=${apiKey}&limit=5`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      return NextResponse.json({
        status: response.status,
        statusText: response.statusText,
        url: url.replace(apiKey, 'API_KEY_HIDDEN'),
        headers: Object.fromEntries(response.headers.entries()),
        data: data,
        dataKeys: Object.keys(data),
        dataString: JSON.stringify(data, null, 2),
      });
    } else if (api === 'google') {
      const apiKey = process.env.GOOGLE_API_KEY || '';
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || '';
      
      if (!apiKey || !searchEngineId) {
        return NextResponse.json({ error: 'Google API credentials not set' }, { status: 400 });
      }

      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=grants&num=5`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      return NextResponse.json({
        status: response.status,
        statusText: response.statusText,
        url: url.replace(apiKey, 'API_KEY_HIDDEN'),
        headers: Object.fromEntries(response.headers.entries()),
        data: data,
        dataKeys: Object.keys(data),
        dataString: JSON.stringify(data, null, 2),
      });
    } else {
      return NextResponse.json({ 
        error: 'Invalid API parameter. Use ?api=simpler, ?api=sam, or ?api=google' 
      }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}


