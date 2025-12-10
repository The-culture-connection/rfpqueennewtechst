import { Opportunity } from '@/types';

// Grants.gov API Integration
export async function fetchGrantsGovOpportunities(params: {
  keyword?: string;
  rows?: number;
  oppStatuses?: string;
  agencies?: string;
  fundingCategories?: string;
}): Promise<Opportunity[]> {
  try {
    const requestBody = {
      rows: params.rows || 100,
      keyword: params.keyword || '',
      oppNum: '',
      eligibilities: '',
      agencies: params.agencies || '',
      oppStatuses: params.oppStatuses || 'forecasted|posted',
      aln: '',
      fundingCategories: params.fundingCategories || '',
    };

    const response = await fetch('https://api.grants.gov/v1/api/search2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Grants.gov API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errorcode !== 0) {
      throw new Error(`Grants.gov API error: ${data.msg || 'Unknown error'}`);
    }

    const opportunities: Opportunity[] = [];

    if (data.data?.oppHits) {
      for (const hit of data.data.oppHits) {
        opportunities.push({
          id: `grants-gov-${hit.id || hit.number || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          source: 'Grants.gov',
          title: hit.title || 'Untitled Opportunity',
          agency: hit.agencyName || hit.agencyCode || '',
          description: hit.title || '', // Grants.gov API doesn't provide description in search2
          openDate: hit.openDate || null,
          closeDate: hit.closeDate || null,
          deadline: hit.closeDate || null,
          city: '',
          state: '',
          contactEmail: '',
          url: `https://www.grants.gov/web/grants/view-opportunity.html?oppId=${hit.id}`,
          amount: '',
          category: hit.alnist?.[0] || '',
          rfpNumber: hit.number || '',
          type: 'Grant',
        });
      }
    }

    return opportunities;
  } catch (error) {
    console.error('Error fetching Grants.gov opportunities:', error);
    return [];
  }
}

// Simpler.Grants.gov API Integration
export async function fetchSimplerGrantsOpportunities(params: {
  query?: string;
  page_size?: number;
  opportunity_status?: string[];
  applicant_type?: string[];
}): Promise<Opportunity[]> {
  try {
    const apiKey = process.env.SIMPLER_GRANTS_API_KEY || 'v08sW5JXAlwXZoWji30tMYkOc';
    
    // Build request body - pagination is required
    const requestBody: any = {
      pagination: {
        page_offset: 1,
        page_size: Math.min(params.page_size || 100, 100),
        sort_order: [
          {
            order_by: "opportunity_id",
            sort_direction: "descending"
          }
        ]
      },
    };

    // Add query if provided
    if (params.query) {
      requestBody.query = params.query;
    }

    // Add filters if provided
    if (params.opportunity_status || !params.query) {
      requestBody.filters = {
        opportunity_status: params.opportunity_status 
          ? { one_of: params.opportunity_status }
          : { one_of: ['posted', 'forecasted'] },
        ...(params.applicant_type && {
          applicant_type: { one_of: params.applicant_type },
        }),
      };
    }

    console.log('[Simpler.Grants.gov] Request body:', JSON.stringify(requestBody, null, 2));
    console.log('[Simpler.Grants.gov] API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
    
    const response = await fetch('https://api.simpler.grants.gov/v1/opportunities/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[Simpler.Grants.gov] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Simpler.Grants.gov] Error response:', errorText);
      throw new Error(`Simpler.Grants.gov API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[Simpler.Grants.gov] Response data keys:', Object.keys(data));
    console.log('[Simpler.Grants.gov] Response sample:', JSON.stringify(data).substring(0, 1000));
    
    const opportunities: Opportunity[] = [];

    // The response structure is { data: [...], ... } where data is directly an array
    const oppsArray = data.data || data.opportunities || data.results || data.items || [];
    console.log('[Simpler.Grants.gov] Found opportunities array:', oppsArray.length);
    
    if (oppsArray && oppsArray.length > 0) {
      for (const opp of oppsArray) {
        // Extract dates from summary if available
        const summary = opp.summary || {};
        const dates = summary.dates || {};
        
        opportunities.push({
          id: `simpler-grants-${opp.opportunity_id || opp.legacy_opportunity_id || opp.opportunity_number || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          source: 'Simpler.Grants.gov',
          title: opp.opportunity_title || opp.title || 'Untitled Opportunity',
          agency: opp.agency_name || opp.agency || '',
          description: summary.description || summary.summary || opp.summary?.description || '',
          openDate: dates.posted_date || dates.open_date || summary.posted_date || null,
          closeDate: dates.close_date || dates.deadline || summary.close_date || summary.deadline || null,
          deadline: dates.close_date || dates.deadline || summary.close_date || summary.deadline || null,
          city: opp.city || summary.city || '',
          state: opp.state || summary.state || '',
          contactEmail: summary.agency_email_address || opp.contact_email || '',
          url: summary.additional_info_url || opp.url || opp.link || `https://www.grants.gov/web/grants/view-opportunity.html?oppId=${opp.legacy_opportunity_id || opp.opportunity_id}`,
          amount: summary.award_ceiling || opp.amount || '',
          category: opp.category || '',
          rfpNumber: opp.opportunity_number || opp.number || '',
          type: 'Grant',
        });
      }
    }

    return opportunities;
  } catch (error) {
    console.error('Error fetching Simpler.Grants.gov opportunities:', error);
    return [];
  }
}

// SAM.gov API Integration
export async function fetchSAMGovOpportunities(params: {
  q?: string;
  limit?: number;
  postedFrom?: string;
  postedTo?: string;
}): Promise<Opportunity[]> {
  try {
    const apiKey = process.env.SAM_GOV_API_KEY || '';
    
    if (!apiKey) {
      console.warn('SAM.gov API key not configured');
      return [];
    }

    // SAM.gov requires PostedFrom and PostedTo - set default dates if not provided
    // Default to last 30 days and next 30 days
    // SAM.gov requires date format: MM/dd/yyyy
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    // Format dates as MM/dd/yyyy for SAM.gov
    const formatSAMDate = (date: Date): string => {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    };

    const postedFrom = params.postedFrom || formatSAMDate(thirtyDaysAgo);
    const postedTo = params.postedTo || formatSAMDate(thirtyDaysFromNow);

    const queryParams = new URLSearchParams({
      api_key: apiKey,
      postedFrom: postedFrom,
      postedTo: postedTo,
      ...(params.q && { q: params.q }),
      ...(params.limit && { limit: params.limit.toString() }),
    });

    // Try different SAM.gov endpoints for opportunities
    // Note: SAM.gov API structure might be different - this is a placeholder
    // The actual endpoint might be different based on SAM.gov's current API structure
    const url = `https://api.sam.gov/prod/opportunities/v2/search?${queryParams}`;
    console.log('[SAM.gov] Request URL:', url.replace(apiKey, 'API_KEY_HIDDEN'));
    console.log('[SAM.gov] API Key:', apiKey ? 'SET' : 'MISSING');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log('[SAM.gov] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SAM.gov] Error response:', errorText);
      
      // Handle rate limiting gracefully - don't throw, just return empty array
      if (response.status === 429) {
        const errorData = JSON.parse(errorText);
        console.warn('[SAM.gov] Rate limit exceeded. Next access time:', errorData.nextAccessTime);
        return [];
      }
      
      throw new Error(`SAM.gov API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[SAM.gov] Response data keys:', Object.keys(data));
    console.log('[SAM.gov] Response sample:', JSON.stringify(data).substring(0, 1000));
    
    const opportunities: Opportunity[] = [];

    // Try different possible response structures for SAM.gov
    const opps = data.opportunities || data.results || data.data?.opportunities || data.data?.results || data._embedded?.opportunities || [];
    console.log('[SAM.gov] Found opportunities array:', opps.length);
    
    if (opps && opps.length > 0) {
      for (const opp of opps) {
        opportunities.push({
          id: `sam-gov-${opp.noticeId || opp.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          source: 'SAM.gov',
          title: opp.title || opp.subject || 'Untitled Opportunity',
          agency: opp.organizationName || opp.agency || '',
          description: opp.description || opp.summary || '',
          openDate: opp.postedDate || opp.posted || null,
          closeDate: opp.responseDeadline || opp.deadline || null,
          deadline: opp.responseDeadline || opp.deadline || null,
          city: opp.city || '',
          state: opp.state || '',
          contactEmail: opp.contactEmail || opp.email || '',
          url: opp.url || opp.link || `https://sam.gov/opp/${opp.noticeId || opp.id}`,
          amount: opp.estimatedValue || opp.amount || '',
          category: opp.naicsCode || opp.category || '',
          rfpNumber: opp.noticeId || opp.solicitationNumber || '',
          type: 'RFP',
        });
      }
    }

    return opportunities;
  } catch (error) {
    console.error('Error fetching SAM.gov opportunities:', error);
    return [];
  }
}

// Google Custom Search API Integration
export async function fetchGoogleCustomSearchOpportunities(params: {
  query: string;
  num?: number;
  searchType?: 'grants' | 'rfps' | 'accelerators' | 'investors';
}): Promise<Opportunity[]> {
  try {
    // Load Google API credentials
    const googleCredentials = process.env.GOOGLE_API_KEY || '';
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || '';
    
    if (!googleCredentials || !searchEngineId) {
      console.warn('Google Custom Search API key or Search Engine ID not configured');
      console.warn('Set GOOGLE_API_KEY and GOOGLE_SEARCH_ENGINE_ID environment variables');
      return [];
    }

    // Build more specific search queries for investors, accelerators, and incubators
    let searchQuery = params.query;
    if (params.searchType === 'accelerators') {
      searchQuery = `"accelerator program" OR "startup accelerator" OR "incubator program" OR "business incubator" ${params.query} application deadline "accepting applications"`;
    } else if (params.searchType === 'investors') {
      searchQuery = `"venture capital" OR "angel investor" OR "seed funding" OR "startup funding" ${params.query} "accepting applications" OR "open for applications"`;
    } else {
      // Default fallback (shouldn't happen with current implementation)
      searchQuery = `${params.query} accelerator OR incubator OR investor`;
    }

    const queryParams = new URLSearchParams({
      key: googleCredentials,
      cx: searchEngineId,
      q: searchQuery,
      num: (params.num || 10).toString(),
    });

    const url = `https://www.googleapis.com/customsearch/v1?${queryParams}`;
    console.log('[Google Search] Request URL:', url.replace(googleCredentials, 'API_KEY_HIDDEN'));
    console.log('[Google Search] API Key:', googleCredentials ? 'SET' : 'MISSING');
    console.log('[Google Search] Search Engine ID:', searchEngineId ? 'SET' : 'MISSING');
    console.log('[Google Search] Search query:', searchQuery);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log('[Google Search] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Google Search] Error response:', errorText);
      throw new Error(`Google Custom Search API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[Google Search] Response data keys:', Object.keys(data));
    console.log('[Google Search] Has items:', !!data.items);
    console.log('[Google Search] Items count:', data.items?.length || 0);
    
    const opportunities: Opportunity[] = [];

    if (data.items) {
      for (const item of data.items) {
        // Extract information from the search result
        const title = item.title || 'Untitled Opportunity';
        const snippet = item.snippet || '';
        const url = item.link || '';
        
        // Try to extract agency/organization from displayLink or snippet
        const agency = item.displayLink || item.pagemap?.metatags?.[0]?.['og:site_name'] || '';
        
        // Try to extract date from snippet or pagemap
        let openDate = null;
        let closeDate = null;
        if (item.pagemap?.metatags?.[0]?.['article:published_time']) {
          openDate = item.pagemap.metatags[0]['article:published_time'];
        }
        if (item.pagemap?.metatags?.[0]?.['article:expiration_time']) {
          closeDate = item.pagemap.metatags[0]['article:expiration_time'];
        }

        opportunities.push({
          id: `google-search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          source: `Google Search (${params.searchType || 'general'})`,
          title: title.replace(/ - .*$/, ''), // Remove site name suffix
          agency: agency,
          description: snippet,
          openDate: openDate,
          closeDate: closeDate,
          deadline: closeDate,
          city: '',
          state: '',
          contactEmail: '',
          url: url,
          amount: '',
          category: params.searchType || '',
          rfpNumber: '',
          // Accelerators and investors are typically RFP-like opportunities
          type: 'RFP',
        });
      }
    }

    return opportunities;
  } catch (error) {
    console.error('Error fetching Google Custom Search opportunities:', error);
    return [];
  }
}

// Main function to fetch all opportunities from all APIs
export async function fetchAllOpportunities(params: {
  keyword?: string;
  limit?: number;
  fundingTypes?: string[];
}): Promise<{ opportunities: Opportunity[]; sourceCounts: Record<string, number> }> {
  const allOpportunities: Opportunity[] = [];
  const sourceCounts: Record<string, number> = {
    grantsGov: 0,
    simplerGrants: 0,
    samGov: 0,
    googleSearch: 0,
  };
  const limit = params.limit || 100;

  try {
    // Fetch from Grants.gov
    console.log('Fetching from Grants.gov...');
    const grantsGovOpps = await fetchGrantsGovOpportunities({
      keyword: params.keyword || '',
      rows: Math.min(limit, 100),
    });
    allOpportunities.push(...grantsGovOpps);
    sourceCounts.grantsGov = grantsGovOpps.length;
    console.log(`Fetched ${grantsGovOpps.length} opportunities from Grants.gov`);

    // Fetch from Simpler.Grants.gov
    console.log('Fetching from Simpler.Grants.gov...');
    const simplerGrantsOpps = await fetchSimplerGrantsOpportunities({
      query: params.keyword || '',
      page_size: Math.min(limit, 100),
    });
    allOpportunities.push(...simplerGrantsOpps);
    sourceCounts.simplerGrants = simplerGrantsOpps.length;
    console.log(`Fetched ${simplerGrantsOpps.length} opportunities from Simpler.Grants.gov`);

    // SAM.gov is now loaded from Firebase Storage CSV file
    // Skip API call - will be loaded separately in the route handler

    // Fetch from Google Custom Search for investors, accelerators, and incubators only
    // Use keyword if provided, otherwise use default search terms
    const searchKeyword = params.keyword || 'funding opportunities';
    const googleQueries = [
      { query: searchKeyword, searchType: 'accelerators' as const },
      { query: searchKeyword, searchType: 'investors' as const },
    ];

    for (const googleQuery of googleQueries) {
      console.log(`Fetching from Google Custom Search (${googleQuery.searchType})...`);
      const googleOpps = await fetchGoogleCustomSearchOpportunities({
        query: googleQuery.query,
        searchType: googleQuery.searchType,
        num: 10,
      });
      allOpportunities.push(...googleOpps);
      sourceCounts.googleSearch += googleOpps.length;
      console.log(`Fetched ${googleOpps.length} opportunities from Google Custom Search (${googleQuery.searchType})`);
    }
  } catch (error) {
    console.error('Error fetching opportunities:', error);
  }

  // Remove duplicates - be less aggressive to preserve opportunities from different sources
  // Only deduplicate if URL AND title match exactly (case-insensitive)
  // Prefer opportunities with more complete data
  const opportunityMap = new Map<string, Opportunity>();
  
  for (const opp of allOpportunities) {
    // Normalize URL and title for comparison
    const normalizedUrl = (opp.url || '').toLowerCase().trim();
    const normalizedTitle = (opp.title || '').toLowerCase().trim();
    const key = `${normalizedUrl}-${normalizedTitle}`;
    
    // Skip if URL or title is empty
    if (!normalizedUrl || !normalizedTitle || normalizedUrl === 'n/a' || normalizedUrl === '') {
      continue;
    }
    
    const existing = opportunityMap.get(key);
    
    if (!existing) {
      // No duplicate, add it
      opportunityMap.set(key, opp);
    } else {
      // Duplicate found - keep the one with more complete data
      // Score based on data completeness
      const existingScore = (existing.description?.length || 0) + 
                           (existing.closeDate ? 10 : 0) + 
                           (existing.amount ? 5 : 0) +
                           (existing.contactEmail ? 3 : 0) +
                           (existing.agency ? 2 : 0);
      const newScore = (opp.description?.length || 0) + 
                      (opp.closeDate ? 10 : 0) + 
                      (opp.amount ? 5 : 0) +
                      (opp.contactEmail ? 3 : 0) +
                      (opp.agency ? 2 : 0);
      
      // If scores are equal, prefer the one from a more specific source
      if (newScore > existingScore || 
          (newScore === existingScore && opp.source?.includes('Simpler') && !existing.source?.includes('Simpler'))) {
        opportunityMap.set(key, opp);
      }
      // Otherwise keep the existing one
    }
  }
  
  const uniqueOpportunities = Array.from(opportunityMap.values());
  const duplicatesRemoved = allOpportunities.length - uniqueOpportunities.length;
  
  if (duplicatesRemoved > 0) {
    console.log(`[Deduplication] Removed ${duplicatesRemoved} duplicate opportunities`);
    console.log(`[Deduplication] Before: ${allOpportunities.length}, After: ${uniqueOpportunities.length}`);
    
    // Log source distribution after deduplication
    const afterDedupCounts = {
      grantsGov: uniqueOpportunities.filter(o => o.source === 'Grants.gov').length,
      simplerGrants: uniqueOpportunities.filter(o => o.source === 'Simpler.Grants.gov').length,
      samGov: uniqueOpportunities.filter(o => o.source === 'SAM.gov').length,
      googleSearch: uniqueOpportunities.filter(o => o.source?.includes('Google Search')).length,
    };
    console.log(`[Deduplication] Source counts after dedup:`, afterDedupCounts);
  }

  return {
    opportunities: uniqueOpportunities.slice(0, limit),
    sourceCounts,
  };
}


