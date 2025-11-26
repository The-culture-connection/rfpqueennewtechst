import { NextResponse } from 'next/server';
import { parseCSV, normalizeOpportunity } from '@/lib/csvParser';
import { getAdminStorage } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5000'); // Default to 5000
    const hasDeadline = searchParams.get('hasDeadline') === 'true';
    const fundingTypes = searchParams.get('fundingTypes')?.split(',') || []; // e.g., "grants,rfps"
    
    // Get Firebase Storage
    let storage, bucket, files;
    // Declare bucketName outside try block so it's available in error handling
    let bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      bucketName = 'therfpqueen-f11fd.firebasestorage.app';
    }
    // Remove gs:// prefix if present (in case env var includes it)
    bucketName = bucketName.replace(/^gs:\/\//, '').replace(/\/$/, '');
    
    try {
      storage = getAdminStorage();
      // Use the correct bucket name - default to firebasestorage.app format
      // The bucket name should be: therpqueen-f11fd.firebasestorage.app
      bucket = storage.bucket(bucketName);
      console.log(`Accessing bucket: ${bucketName}, looking for files in exports/ folder`);
      
      // List all files in the exports folder
      [files] = await bucket.getFiles({ prefix: 'exports/' });
      console.log(`Found ${files.length} total files in Firebase Storage exports/ folder`);
      
      // If no files found with prefix, try without prefix to see what's in the bucket
      if (files.length === 0) {
        console.log('No files found in exports/ folder, listing all files in bucket...');
        const [allFiles] = await bucket.getFiles();
        console.log(`Total files in bucket: ${allFiles.length}`);
        console.log(`Sample file names: ${allFiles.slice(0, 5).map(f => f.name).join(', ')}`);
        
        // Try different path variations
        const pathVariations = ['exports/', 'exports', '/exports/', '/exports'];
        for (const pathPrefix of pathVariations) {
          const [pathFiles] = await bucket.getFiles({ prefix: pathPrefix });
          if (pathFiles.length > 0) {
            console.log(`Found ${pathFiles.length} files with prefix: ${pathPrefix}`);
            files = pathFiles;
            break;
          }
        }
        
        // If still no files, filter all files for CSV
        if (files.length === 0) {
          files = allFiles.filter(file => {
            const name = file.name.toLowerCase();
            return name.endsWith('.csv') || name.endsWith('.txt');
          });
          console.log(`Found ${files.length} CSV files in bucket (any location)`);
        }
      }
    } catch (storageError: any) {
      console.error('Error accessing Firebase Storage:', storageError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to access Firebase Storage',
          details: storageError.message 
        },
        { status: 500 }
      );
    }
    
    if (!files || files.length === 0) {
      console.warn('No files found in exports/ folder');
      // Try to list all files to debug
      try {
        const [allFiles] = await bucket.getFiles();
        console.log(`Debug: Total files in bucket: ${allFiles.length}`);
        if (allFiles.length > 0) {
          console.log(`Debug: First 10 file names: ${allFiles.slice(0, 10).map(f => f.name).join(', ')}`);
        }
      } catch (e) {
        console.error('Debug: Error listing all files:', e);
      }
      return NextResponse.json({
        success: true,
        count: 0,
        opportunities: [],
        hasMore: false,
        message: 'No CSV files found in Firebase Storage exports folder',
        debug: {
          bucket: bucketName,
          prefix: 'exports/',
          totalFilesInBucket: 'Check logs for details'
        }
      });
    }
    
    // Filter for CSV files only
    let csvFiles = files.filter(file => {
      const fileName = file.name.toLowerCase();
      return fileName.endsWith('.csv') || fileName.endsWith('.txt');
    });
    
    // Filter CSV files based on funding types if provided
    if (fundingTypes.length > 0) {
      csvFiles = csvFiles.filter(file => {
        // Get filename without path (remove 'exports/' prefix)
        const fileName = file.name.replace('exports/', '').toLowerCase();
        
        // Check if filename matches any of the requested funding types
        return fundingTypes.some(type => {
          switch (type.toLowerCase()) {
            case 'grants':
              return fileName.includes('grant');
            case 'rfps':
              return fileName.includes('rfp');
            case 'contracts':
              // Match "contract" or "govcontract" (like Govcontracts.csv)
              return fileName.includes('contract') || fileName.includes('sam') || fileName.includes('govcontract');
            default:
              return false;
          }
        });
      });
      
      console.log(`Found ${csvFiles.length} CSV/TXT files matching funding types: ${fundingTypes.join(', ')}`);
      console.log(`Matching files: ${csvFiles.map(f => f.name.replace('exports/', '')).join(', ')}`);
    } else {
      console.log(`Found ${csvFiles.length} CSV/TXT files in Firebase Storage exports folder`);
      console.log(`All files: ${csvFiles.map(f => f.name.replace('exports/', '')).join(', ')}`);
    }
    
    const allOpportunities = [];
    let totalProcessed = 0;
    
    for (const file of csvFiles) {
      try {
        // Download file from Firebase Storage
        const [fileContent] = await file.download();
        const csvContent = fileContent.toString('utf-8');
        
        // Get filename from Storage path (remove 'exports/' prefix)
        const fileName = file.name.replace('exports/', '');
        
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
        const fileName = file.name.replace('exports/', '');
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
  } catch (error: any) {
    console.error('Error loading opportunities:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to load opportunities',
        details: error?.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
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

