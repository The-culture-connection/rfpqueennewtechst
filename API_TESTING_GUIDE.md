# API Testing Guide

I've created individual test endpoints for each API so you can debug them separately.

## Test Endpoints

### 1. Test Grants.gov API
```
http://localhost:3000/api/test-grants-gov?rows=10&keyword=education
```

### 2. Test Simpler.Grants.gov API
```
http://localhost:3000/api/test-simpler-grants?page_size=10&query=education
```

### 3. Test SAM.gov API
```
http://localhost:3000/api/test-sam-gov?limit=10&q=education
```

### 4. Test Google Custom Search API
```
http://localhost:3000/api/test-google-search?query=grants&searchType=grants&num=10
```

## What to Check

1. **Check the server console logs** - Each API call now logs:
   - Request parameters
   - API key status
   - Response status
   - Response data structure
   - Any errors

2. **Check the response** - Each test endpoint returns:
   - Success/failure status
   - Count of opportunities found
   - The actual opportunities (if any)
   - API key status
   - Error messages (if any)

## Common Issues

### Simpler.Grants.gov API
- **Issue**: Endpoint might be wrong
- **Check**: The API documentation says the base URL is `https://api.simpler.grants.gov`
- **Possible endpoints**:
  - `/v1/opportunities/search` (current)
  - `/v1/search`
  - `/opportunities/search`
- **Action**: Check the OpenAPI docs at https://wiki.simpler.grants.gov/product/api

### SAM.gov API
- **Issue**: API endpoint or authentication might be wrong
- **Check**: SAM.gov API might require different authentication
- **Possible issues**:
  - API key format
  - Endpoint URL structure
  - Required headers
- **Action**: Check SAM.gov API documentation for the correct endpoint format

### Google Custom Search API
- **Issue**: Search Engine ID or API key might be incorrect
- **Check**: 
  - Verify the Search Engine ID is correct
  - Verify the API key has Custom Search API enabled
  - Check API quota limits
- **Action**: 
  - Verify in Google Cloud Console that Custom Search API is enabled
  - Check that the Search Engine ID matches your Custom Search Engine

## Debugging Steps

1. **Test each API individually** using the test endpoints above
2. **Check server console** for detailed logs
3. **Check the response** from each test endpoint
4. **Compare with API documentation** to verify:
   - Endpoint URLs
   - Request format
   - Response structure
   - Authentication method

## Next Steps

After testing each API:

1. Share the console logs from each test
2. Share the response from each test endpoint
3. We can then fix the specific issues for each API


