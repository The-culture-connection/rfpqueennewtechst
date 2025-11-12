import { Opportunity } from '@/types';

// Parse CSV string into array of objects
export function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Get headers from first line
  const headers = parseCSVLine(lines[0]);
  
  // Parse remaining lines
  const data: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index].trim();
      });
      data.push(row);
    }
  }
  
  return data;
}

// Parse a single CSV line, handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// Normalize CSV data to Opportunity format
export function normalizeOpportunity(row: Record<string, string>, source: string): Opportunity {
  // Common field mappings
  const title = row['Title'] || row['title'] || row['Opportunity Title'] || '';
  const description = row['Description'] || row['description'] || row['Synopsis'] || row['parsedDescription'] || '';
  const deadline = row['Deadline'] || row['deadline'] || row['Response Deadline'] || row['Close Date'] || row['closeDate'] || row['responseDeadline'] || '';
  const agency = row['Agency'] || row['agency'] || row['Department'] || row['department'] || row['Organization'] || '';
  const city = row['City'] || row['city'] || row['parsedCity'] || '';
  const state = row['State'] || row['state'] || row['parsedState'] || '';
  const url = row['URL'] || row['url'] || row['Link'] || row['link'] || row['Synopsis URL'] || row['synopsisUrl'] || '';
  const amount = row['Amount'] || row['amount'] || row['Award Amount'] || row['Estimated Value'] || '';
  const type = row['Type'] || row['type'] || (source === 'grantwatch' ? 'Grant' : 'RFP');
  
  return {
    id: `${source}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    source,
    title,
    agency,
    description,
    openDate: row['Posted Date'] || row['postedDate'] || row['Open Date'] || row['openDate'] || null,
    closeDate: deadline || null,
    deadline,
    city,
    state,
    contactEmail: row['Contact Email'] || row['contactEmail'] || row['Primary Email'] || row['primaryEmail'] || '',
    url,
    amount,
    category: row['Category'] || row['category'] || '',
    rfpNumber: row['RFP Number'] || row['rfpNumber'] || row['Bid Number'] || '',
    type: type as 'RFP' | 'Grant',
  };
}

// Note: Opportunities are now loaded via API route /api/opportunities
// which dynamically reads all CSV files from the Opportunities folder

