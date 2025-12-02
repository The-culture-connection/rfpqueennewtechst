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
  // Helper function to find value by multiple possible keys (case-insensitive)
  const findValue = (keys: string[]): string => {
    for (const key of keys) {
      // Try exact match first
      if (row[key]) return row[key];
      // Try case-insensitive match
      const foundKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
      if (foundKey && row[foundKey]) return row[foundKey];
    }
    return '';
  };

  // Common field mappings - try multiple variations (case-insensitive)
  // For grants.gov files, column names are often ALL UPPERCASE
  const title = findValue([
    'OPPORTUNITY TITLE',  // Grants.gov format (all uppercase)
    'Title',
    'title',
    'Opportunity Title',
    'opportunityTitle',
    'OpportunityTitle',
    'Posting Title',
    'postingTitle',
    'PostingTitle',
    'Name',
    'name',
  ]) || '';
    
  const description = findValue([
    'FUNDING DESCRIPTION',  // Grants.gov format
    'Description',
    'description',
    'Synopsis',
    'synopsis',
    'parsedDescription',
    'Summary',
    'summary',
  ]) || '';
    
  const deadline = findValue([
    'CLOSE DATE',  // Grants.gov format
    'ESTIMATED APPLICATION DUE DATE',  // Grants.gov format
    'Deadline',
    'deadline',
    'Response Deadline',
    'responseDeadline',
    'Close Date',
    'closeDate',
    'close_date',
    'CloseDate',
    'Due Date',
    'dueDate',
    'DueDate',
    'Application Due Date',
    'applicationDueDate',
  ]) || '';
    
  const agency = findValue([
    'AGENCY NAME',  // Grants.gov format
    'Agency',
    'agency',
    'Department',
    'department',
    'Organization',
    'organization',
    'agencyName',
    'AgencyName',
  ]) || '';
    
  const city = findValue(['City', 'city', 'parsedCity']) || '';
  const state = findValue(['State', 'state', 'parsedState']) || '';
  
  let url = findValue([
    'LINK TO ADDITIONAL INFORMATION',  // Grants.gov format
    'URL',
    'url',
    'Link',
    'link',
    'Synopsis URL',
    'synopsisUrl',
    'Opportunity URL',
    'opportunityUrl',
    'OpportunityUrl',
  ]) || '';
    
  const amount = findValue([
    'ESTIMATED TOTAL FUNDING',  // Grants.gov format
    'AWARD CEILING',  // Grants.gov format
    'Amount',
    'amount',
    'Award Amount',
    'awardAmount',
    'AwardAmount',
    'Estimated Value',
    'estimatedValue',
    'EstimatedValue',
    'Total Program Funding',
    'totalProgramFunding',
  ]) || '';
    
  // Determine type based on source or explicit type field
  const type = 
    row['Type'] || 
    row['type'] || 
    (source.toLowerCase().includes('grant') ? 'Grant' : 
     source.toLowerCase().includes('rfp') ? 'RFP' : 
     'Grant'); // Default to Grant for grants.gov files
  
  // Fix malformed RFPMart URLs (missing slash after .com)
  if (url && url.includes('rfpmart.com') && !url.includes('rfpmart.com/')) {
    url = url.replace('rfpmart.com', 'rfpmart.com/');
  }
  
  const openDate = findValue([
    'POSTED DATE',  // Grants.gov format
    'ESTIMATED POST DATE',  // Grants.gov format
    'Posted Date',
    'postedDate',
    'Open Date',
    'openDate',
  ]) || null;

  const contactEmail = findValue([
    'GRANTOR CONTACT EMAIL',  // Grants.gov format
    'Contact Email',
    'contactEmail',
    'Primary Email',
    'primaryEmail',
  ]) || '';

  const category = findValue([
    'CATEGORY OF FUNDING ACTIVITY',  // Grants.gov format
    'Category',
    'category',
  ]) || '';

  const rfpNumber = findValue([
    'OPPORTUNITY NUMBER',  // Grants.gov format (but might be a HYPERLINK formula)
    'RFP Number',
    'rfpNumber',
    'Bid Number',
  ]) || '';

  // Clean up OPPORTUNITY NUMBER if it's a HYPERLINK formula
  let cleanedRfpNumber = rfpNumber;
  if (cleanedRfpNumber && cleanedRfpNumber.startsWith('=HYPERLINK')) {
    // Extract the actual number from the HYPERLINK formula
    // Format: =HYPERLINK("url", "number")
    const match = cleanedRfpNumber.match(/"([^"]+)"/g);
    if (match && match.length >= 2) {
      cleanedRfpNumber = match[1].replace(/^"|"$/g, ''); // Get the second quoted value
    } else {
      cleanedRfpNumber = ''; // If we can't parse it, just use empty
    }
  }
  
  return {
    id: `${source}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    source,
    title,
    agency,
    description,
    openDate,
    closeDate: deadline || null,
    deadline,
    city,
    state,
    contactEmail,
    url,
    amount,
    category,
    rfpNumber: cleanedRfpNumber,
    type: type as 'RFP' | 'Grant',
  };
}

// Note: Opportunities are now loaded via API route /api/opportunities
// which dynamically reads all CSV files from the Opportunities folder

