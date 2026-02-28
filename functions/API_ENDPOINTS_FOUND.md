# API Endpoints Found in Codebase

I've scraped your codebase and found the exact endpoint URLs and authentication methods for all your APIs:

## 1. Grants.gov ✅ VERIFIED WORKING

**Endpoint:** `https://api.grants.gov/v1/api/search2`  
**Method:** `POST`  
**Authentication:** None required (verified)  
**Request Body:**
```json
{
  "rows": 100,
  "keyword": "",
  "oppNum": "",
  "eligibilities": "",
  "agencies": "",
  "oppStatuses": "forecasted|posted",
  "aln": "",
  "fundingCategories": ""
}
```
**Response Format:** `{ errorcode: 0, msg: "Webservice Succeeds", data: { oppHits: [] } }`

**Test Command (PowerShell):**
```powershell
$uri = "https://api.grants.gov/v1/api/search2"
$body = @{
    rows = 10
    keyword = ""
    oppNum = ""
    eligibilities = ""
    agencies = ""
    oppStatuses = "forecasted|posted"
    aln = ""
    fundingCategories = ""
} | ConvertTo-Json

$headers = @{ "Content-Type" = "application/json" }
Invoke-WebRequest -Uri $uri -Method POST -Headers $headers -Body $body -UseBasicParsing
```

**Note:** The endpoint works correctly. If you get "Missing Authentication Token", check that:
- The `Content-Type` header is set (capital C and T)
- The request body is valid JSON
- You're using POST method (not GET)

---

## 2. Simpler.Grants.gov

**Endpoint:** `https://api.simpler.grants.gov/v1/opportunities/search`  
**Method:** `POST`  
**Authentication:** `X-API-Key` header  
**Request Body:**
```json
{
  "pagination": {
    "page_offset": 1,
    "page_size": 100,
    "sort_order": [
      {
        "order_by": "opportunity_id",
        "sort_direction": "descending"
      }
    ]
  },
  "filters": {
    "opportunity_status": {
      "one_of": ["posted", "forecasted"]
    }
  }
}
```
**Response Format:** `{ opportunities: [] }`  
**Note:** Default API key in code: `v08sW5JXAlwXZoWji30tMYkOc` (but you should use your own)

---

## 3. SAM.gov

**Endpoint:** `https://api.sam.gov/prod/opportunities/v2/search`  
**Method:** `GET`  
**Authentication:** `api_key` query parameter  
**Required Query Params:**
- `api_key` - Your SAM.gov API key
- `postedFrom` - Date in MM/dd/yyyy format (e.g., "01/01/2024")
- `postedTo` - Date in MM/dd/yyyy format (e.g., "12/31/2025")
- `limit` - Number of results (optional)

**Example URL:**
```
https://api.sam.gov/prod/opportunities/v2/search?api_key=YOUR_KEY&postedFrom=01/01/2024&postedTo=12/31/2025&limit=100
```

**Note:** Your codebase also loads SAM.gov from CSV files in Firebase Storage, but this is the API endpoint.

---

## 4. Google Custom Search

**Endpoint:** `https://www.googleapis.com/customsearch/v1`  
**Method:** `GET`  
**Authentication:** `key` query parameter (API key)  
**Required Query Params:**
- `key` - Your Google API key
- `cx` - Your Google Custom Search Engine ID
- `q` - Search query
- `num` - Number of results (max 10 per request)

**Example URL:**
```
https://www.googleapis.com/customsearch/v1?key=YOUR_API_KEY&cx=YOUR_SEARCH_ENGINE_ID&q=grants&num=10
```

**Environment Variables Needed:**
- `GOOGLE_API_KEY` - From Google Cloud Console
- `GOOGLE_SEARCH_ENGINE_ID` - From Google Custom Search Engine settings

---

## 5. Local JSON (Future)

**Endpoint:** Your custom endpoint URL  
**Method:** `GET` (or `POST` if needed)  
**Authentication:** Configure as needed

---

## Complete SOURCES_JSON Configuration

Use this template (replace YOUR_* placeholders):

```json
[
  {
    "source": "grantsGov",
    "endpointUrl": "https://api.grants.gov/v1/api/search2",
    "method": "POST",
    "auth": {
      "type": "none"
    },
    "requestBody": {
      "rows": 100,
      "keyword": "",
      "oppNum": "",
      "eligibilities": "",
      "agencies": "",
      "oppStatuses": "forecasted|posted",
      "aln": "",
      "fundingCategories": ""
    }
  },
  {
    "source": "samGov",
    "endpointUrl": "https://api.sam.gov/prod/opportunities/v2/search",
    "method": "GET",
    "auth": {
      "type": "apiKey",
      "queryParam": "api_key",
      "token": "YOUR_SAM_GOV_API_KEY"
    },
    "additionalQueryParams": {
      "postedFrom": "01/01/2024",
      "postedTo": "12/31/2025",
      "limit": "100"
    }
  },
  {
    "source": "simplerGrants",
    "endpointUrl": "https://api.simpler.grants.gov/v1/opportunities/search",
    "method": "POST",
    "auth": {
      "type": "apiKey",
      "headerName": "X-API-Key",
      "token": "YOUR_SIMPLER_GRANTS_API_KEY"
    },
    "requestBody": {
      "pagination": {
        "page_offset": 1,
        "page_size": 100,
        "sort_order": [
          {
            "order_by": "opportunity_id",
            "sort_direction": "descending"
          }
        ]
      },
      "filters": {
        "opportunity_status": {
          "one_of": ["posted", "forecasted"]
        }
      }
    }
  },
  {
    "source": "googleSearch",
    "endpointUrl": "https://www.googleapis.com/customsearch/v1",
    "method": "GET",
    "auth": {
      "type": "apiKey",
      "queryParam": "key",
      "token": "YOUR_GOOGLE_API_KEY"
    },
    "additionalQueryParams": {
      "cx": "YOUR_GOOGLE_SEARCH_ENGINE_ID",
      "q": "grants funding opportunities",
      "num": "10"
    }
  }
]
```

---

## Important Notes

1. **Grants.gov** - No auth needed, but requires POST with JSON body
2. **Simpler.Grants.gov** - Requires `X-API-Key` header (not bearer token!)
3. **SAM.gov** - Requires `api_key` query param + date range (postedFrom/postedTo)
4. **Google Search** - Requires both `key` (API key) and `cx` (Search Engine ID) query params
5. **Method Support** - The ingestion function now supports both GET and POST requests

---

## Updated Function Features

The ingestion function has been updated to:
- ✅ Support POST requests with JSON bodies
- ✅ Handle source-specific response formats (Grants.gov, Simpler.Grants.gov)
- ✅ Support additional query parameters (for Google Search `cx` parameter)
- ✅ Handle pagination for Simpler.Grants.gov (page_offset)

---

## Next Steps

1. **Get your API keys:**
   - SAM.gov: https://api.sam.gov/
   - Simpler.Grants.gov: Use default key or get your own from their dashboard
   - Google: Google Cloud Console + Custom Search Engine

2. **Update the template** with your actual API keys

3. **Set the secret:**
   ```bash
   firebase functions:secrets:set SOURCES_JSON
   # Paste your complete JSON (can be multi-line)
   ```

4. **Test:**
   ```powershell
   Invoke-WebRequest -Uri "https://us-central1-therfpqueen-f11fd.cloudfunctions.net/ingestOpportunitiesHttp" -Method POST -UseBasicParsing
   ```
