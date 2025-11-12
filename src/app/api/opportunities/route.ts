import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { parseCSV, normalizeOpportunity } from '@/lib/csvParser';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5000'); // Default to 5000
    const hasDeadline = searchParams.get('hasDeadline') === 'true';
    const fundingTypes = searchParams.get('fundingTypes')?.split(',') || []; // e.g., "grants,rfps"
    
    const opportunitiesDir = path.join(process.cwd(), 'Opportunities');
    
    // Read all files in the Opportunities directory
    const files = await fs.readdir(opportunitiesDir);
    
    // Filter for CSV files only
    let csvFiles = files.filter(file => 
      file.toLowerCase().endsWith('.csv') || file.toLowerCase().endsWith('.txt')
    );
    
    // Filter CSV files based on funding types if provided
    if (fundingTypes.length > 0) {
      csvFiles = csvFiles.filter(fileName => {
        const nameLower = fileName.toLowerCase();
        
        // Check if filename matches any of the requested funding types
        return fundingTypes.some(type => {
          switch (type.toLowerCase()) {
            case 'grants':
              return nameLower.includes('grant');
            case 'rfps':
              return nameLower.includes('rfp');
            case 'contracts':
              return nameLower.includes('contract') || nameLower.includes('sam');
            default:
              return false;
          }
        });
      });
      
      console.log(`Found ${csvFiles.length} CSV/TXT files matching funding types: ${fundingTypes.join(', ')}`);
    } else {
      console.log(`Found ${csvFiles.length} CSV/TXT files in Opportunities folder`);
    }
    
    const allOpportunities = [];
    let totalProcessed = 0;
    
    for (const fileName of csvFiles) {
      try {
        const filePath = path.join(opportunitiesDir, fileName);
        const csvContent = await fs.readFile(filePath, 'utf-8');
        
        // Determine source from filename
        const source = determineSource(fileName);
        
        // Parse CSV
        const rows = parseCSV(csvContent);
        console.log(`Parsed ${rows.length} rows from ${fileName}`);
        
        // Normalize each row
        for (const row of rows) {
          try {
            const opportunity = normalizeOpportunity(row, source);
            
            // Only add if it has a title
            if (!opportunity.title || opportunity.title.trim().length === 0) {
              continue;
            }
            
            // Filter: only include opportunities with deadlines if requested
            if (hasDeadline && !opportunity.closeDate && !opportunity.deadline) {
              continue;
            }
            
            // Filter: only include opportunities with future deadlines
            if (opportunity.closeDate || opportunity.deadline) {
              try {
                const deadlineDate = new Date(opportunity.closeDate || opportunity.deadline || '');
                const today = new Date();
                if (deadlineDate < today) {
                  continue; // Skip past deadlines
                }
              } catch {
                // If date parsing fails, include it anyway
              }
            }
            
            allOpportunities.push(opportunity);
            totalProcessed++;
            
            // Stop if we've reached the limit
            if (totalProcessed >= limit) {
              break;
            }
          } catch (err) {
            // Skip invalid rows
            console.warn(`Error normalizing row in ${fileName}:`, err);
          }
        }
        
        // Stop processing files if we've reached the limit
        if (totalProcessed >= limit) {
          break;
        }
      } catch (err) {
        console.error(`Error processing ${fileName}:`, err);
      }
    }
    
    console.log(`Total opportunities loaded: ${allOpportunities.length} (limit: ${limit})`);
    
    return NextResponse.json({
      success: true,
      count: allOpportunities.length,
      opportunities: allOpportunities,
      hasMore: totalProcessed >= limit,
    });
  } catch (error) {
    console.error('Error loading opportunities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load opportunities' },
      { status: 500 }
    );
  }
}

function determineSource(fileName: string): string {
  const name = fileName.toLowerCase();
  
  if (name.includes('grantwatch')) return 'grantwatch';
  if (name.includes('pnd') || name.includes('philanthropy')) return 'pnd';
  if (name.includes('rfpmart')) return 'rfpmart';
  if (name.includes('bidsusa') || name.includes('bid')) return 'bidsusa';
  if (name.includes('grants-gov') || name.includes('grants.gov')) return 'grants.gov';
  if (name.includes('contract') || name.includes('sam')) return 'SAM';
  
  // Default to filename without extension
  return name.replace(/\.[^/.]+$/, '');
}

