import { NextResponse } from 'next/server';
import { parseCSV, normalizeOpportunity } from '@/lib/csvParser';
import { getAdminStorage } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  // Log immediately - this confirms the route handler is being called
  const requestUrl = request.url;
  const requestMethod = request.method;
  const timestamp = new Date().toISOString();
  
  console.log('='.repeat(80));
  console.log(`[API] [${timestamp}] Opportunities route handler invoked`);
  console.log(`[API] Request URL: ${requestUrl}`);
  console.log(`[API] Request Method: ${requestMethod}`);
  console.log(`[API] Request Headers:`, Object.fromEntries(request.headers.entries()));
  console.log(`[API] Environment: ${process.env.NODE_ENV || 'unknown'}`);
  console.log(`[API] Vercel Environment: ${process.env.VERCEL_ENV || 'not-vercel'}`);
  console.log('='.repeat(80));
  
  try {
    // Validate environment variables first
    const requiredEnvVars = {
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? 'SET' : 'MISSING',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    };
    console.log('[API] Environment variables check:', requiredEnvVars);
    
    // Check for missing environment variables
    const missingVars: string[] = [];
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) missingVars.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    if (!process.env.FIREBASE_CLIENT_EMAIL) missingVars.push('FIREBASE_CLIENT_EMAIL');
    if (!process.env.FIREBASE_PRIVATE_KEY) missingVars.push('FIREBASE_PRIVATE_KEY');
    if (!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) missingVars.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
    
    if (missingVars.length > 0) {
      console.error('[ERROR] Missing required environment variables:', missingVars);
      return NextResponse.json(
        {
          success: false,
          error: 'Configuration Error',
          message: 'Missing required Firebase environment variables',
          missingVariables: missingVars,
          fix: `Set these environment variables in Vercel Dashboard → Settings → Environment Variables: ${missingVars.join(', ')}`,
          details: 'The API route cannot access Firebase Storage without proper credentials.'
        },
        { status: 500 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    
    // Health check endpoint - returns immediately without processing
    if (searchParams.get('health') === 'true') {
      console.log('[API] Health check requested');
      return NextResponse.json({
        success: true,
        status: 'healthy',
        route: '/api/opportunities',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        vercel: process.env.VERCEL_ENV || 'local',
        message: 'API route is accessible'
      });
    }
    
    const limit = parseInt(searchParams.get('limit') || '5000'); // Default to 5000
    const hasDeadline = searchParams.get('hasDeadline') === 'true';
    const fundingTypes = searchParams.get('fundingTypes')?.split(',') || []; // e.g., "grants,rfps"
    console.log('[API] Request params:', { limit, hasDeadline, fundingTypes });
    
    // Get Firebase Storage
    let storage, bucket, files;
    // Declare bucketName outside try block so it's available in error handling
    // Correct path: gs://therfpqueen-f11fd.firebasestorage.app/exports
    // Bucket name: therpqueen-f11fd.firebasestorage.app
    let bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      bucketName = 'therfpqueen-f11fd.firebasestorage.app';
    }
    // Remove gs:// prefix and any trailing paths if present
    bucketName = bucketName.replace(/^gs:\/\//, '').split('/')[0]; // Get just the bucket name, remove /exports if present
    
    try {
      console.log('[API] Initializing Firebase Admin Storage...');
      storage = getAdminStorage();
      console.log('[API] Firebase Admin Storage initialized successfully');
      
      // Use the correct bucket name - default to firebasestorage.app format
      // The bucket name should be: therpqueen-f11fd.firebasestorage.app
      console.log(`[DEBUG] Bucket name from env: ${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}`);
      console.log(`[DEBUG] Using bucket: ${bucketName}`);
      console.log(`[DEBUG] Looking for files with prefix: exports/`);
      
      bucket = storage.bucket(bucketName);
      console.log(`[API] Bucket reference created: ${bucketName}`);
      
      // List all files in the exports folder
      [files] = await bucket.getFiles({ prefix: 'exports/' });
      console.log(`[DEBUG] Found ${files.length} total files in Firebase Storage exports/ folder`);
      if (files.length > 0) {
        console.log(`[DEBUG] File names: ${files.map(f => f.name).join(', ')}`);
      }
      
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
      console.error('[ERROR] Error accessing Firebase Storage:', storageError);
      console.error('[ERROR] Error type:', storageError?.name);
      console.error('[ERROR] Error message:', storageError?.message);
      console.error('[ERROR] Error code:', storageError?.code);
      console.error('[ERROR] Stack:', storageError?.stack);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Failed to access Firebase Storage';
      let fix = '';
      let details = storageError?.message || 'Unknown error';
      
      if (storageError?.message?.includes('Missing Firebase Admin credentials')) {
        errorMessage = 'Firebase Admin SDK Configuration Error';
        details = 'Firebase Admin SDK cannot be initialized. Check environment variables.';
        fix = 'Verify all Firebase environment variables are set in Render Dashboard → Environment';
      } else if (storageError?.message?.includes('Invalid credential') || storageError?.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid Firebase Credentials';
        details = 'The Firebase service account credentials are invalid or malformed.';
        fix = 'Check FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in Render. Private key must include \\n for newlines.';
      } else if (storageError?.code === 7 || storageError?.message?.includes('Permission denied')) {
        errorMessage = 'Firebase Storage Permission Denied';
        details = 'The service account does not have permission to access Firebase Storage.';
        fix = 'Go to Firebase Console → IAM & Admin → Service Accounts → Grant "Storage Admin" role to your service account';
      } else if (storageError?.code === 5 || storageError?.message?.includes('Not found')) {
        errorMessage = 'Firebase Storage Bucket Not Found';
        details = `Bucket "${bucketName}" does not exist or cannot be accessed.`;
        fix = `Verify bucket name "${bucketName}" is correct. Check NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET in Render. Should be: therpqueen-f11fd.firebasestorage.app`;
      } else if (storageError?.code === 14 || storageError?.message?.includes('UNAVAILABLE')) {
        errorMessage = 'Firebase Storage Unavailable';
        details = 'Firebase Storage service is temporarily unavailable.';
        fix = 'Wait a few minutes and try again. Check Firebase status page.';
      } else if (storageError?.message?.includes('timeout') || storageError?.code === 4) {
        errorMessage = 'Firebase Storage Request Timeout';
        details = 'The request to Firebase Storage timed out. This may happen with large files.';
        fix = 'Try reducing the limit parameter or check network connectivity.';
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          details: details,
          fix: fix,
          type: storageError?.name || 'Error',
          code: storageError?.code,
          bucket: bucketName
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
        console.log(`[API] Processing file: ${file.name}`);
        
        // Download file from Firebase Storage
        let fileContent: Buffer;
        let csvContent: string;
        
        try {
          [fileContent] = await file.download();
          csvContent = fileContent.toString('utf-8');
          console.log(`[API] Downloaded ${file.name}, size: ${fileContent.length} bytes`);
        } catch (downloadError: any) {
          console.error(`[ERROR] Failed to download file ${file.name}:`, downloadError);
          throw new Error(`Failed to download file ${file.name}: ${downloadError?.message || 'Unknown error'}`);
        }
        
        if (!csvContent || csvContent.length === 0) {
          console.warn(`[WARN] File ${file.name} is empty, skipping`);
          continue;
        }
        
        // Get filename from Storage path (remove 'exports/' prefix)
        const fileName = file.name.replace(/^exports\//, '').replace(/^\//, '');
        
        // Determine source from filename
        const source = determineSource(fileName);
        
        // Parse CSV
        let rows: Record<string, string>[];
        try {
          rows = parseCSV(csvContent);
          console.log(`[API] Parsed ${rows.length} rows from ${fileName}`);
        } catch (parseError: any) {
          console.error(`[ERROR] Failed to parse CSV from ${fileName}:`, parseError);
          throw new Error(`CSV parsing error in ${fileName}: ${parseError?.message || 'Invalid CSV format'}`);
        }
        
        if (!rows || rows.length === 0) {
          console.warn(`[WARN] No rows parsed from ${fileName}, skipping`);
          continue;
        }
        
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
      } catch (err: any) {
        const fileName = file.name.replace(/^exports\//, '').replace(/^\//, '');
        console.error(`[ERROR] Error processing file ${fileName}:`, err);
        console.error(`[ERROR] Error type:`, err?.name);
        console.error(`[ERROR] Error message:`, err?.message);
        console.error(`[ERROR] Error stack:`, err?.stack);
        // Continue processing other files even if one fails
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
    console.error('[ERROR] Fatal error in opportunities route:', error);
    console.error('[ERROR] Error type:', error?.name);
    console.error('[ERROR] Error message:', error?.message);
    console.error('[ERROR] Error code:', error?.code);
    console.error('[ERROR] Error stack:', error?.stack);
    
    // Provide specific error messages based on error type
    let errorMessage = 'Failed to load opportunities';
    let fix = '';
    let details = error?.message || 'Unknown error';
    
    if (error?.message?.includes('Missing Firebase Admin credentials')) {
      errorMessage = 'Firebase Configuration Error';
      details = 'Firebase Admin SDK cannot be initialized. Missing or invalid credentials.';
      fix = 'Check all Firebase environment variables in Render Dashboard → Environment. Verify FIREBASE_PRIVATE_KEY format includes \\n for newlines.';
    } else if (error?.message?.includes('Invalid credential') || error?.code === 'auth/invalid-credential') {
      errorMessage = 'Invalid Firebase Credentials';
      details = 'The Firebase service account credentials are invalid.';
      fix = 'Verify FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY match your service account JSON file.';
    } else if (error?.code === 7 || error?.message?.includes('Permission denied')) {
      errorMessage = 'Firebase Permission Denied';
      details = 'The service account does not have required permissions.';
      fix = 'Grant "Storage Admin" or "Storage Object Viewer" role to your service account in Firebase Console → IAM & Admin.';
    } else if (error?.code === 5 || error?.message?.includes('Not found')) {
      errorMessage = 'Resource Not Found';
      details = 'The requested Firebase resource was not found.';
      fix = 'Verify bucket name and file paths are correct. Check Firebase Storage console.';
    } else if (error?.code === 14 || error?.message?.includes('UNAVAILABLE')) {
      errorMessage = 'Firebase Service Unavailable';
      details = 'Firebase services are temporarily unavailable.';
      fix = 'Wait a few minutes and try again. Check Firebase status at status.firebase.google.com';
    } else if (error?.message?.includes('timeout') || error?.code === 4) {
      errorMessage = 'Request Timeout';
      details = 'The request took too long to complete. This may happen with very large CSV files.';
      fix = 'Try reducing the limit parameter. Consider processing files in smaller batches.';
    } else if (error?.message?.includes('ENOTFOUND') || error?.message?.includes('ECONNREFUSED')) {
      errorMessage = 'Network Connection Error';
      details = 'Cannot connect to Firebase services. Network issue or DNS problem.';
      fix = 'Check Render service network connectivity. Verify Firebase project is active.';
    } else if (error?.message?.includes('Memory') || error?.message?.includes('heap')) {
      errorMessage = 'Out of Memory';
      details = 'Processing too much data at once. File is too large.';
      fix = 'Reduce the limit parameter. Process files one at a time. Consider using streaming for large files.';
    } else if (error?.name === 'TypeError' || error?.name === 'ReferenceError') {
      errorMessage = 'Code Error';
      details = `JavaScript error: ${error?.message}`;
      fix = 'Check server logs for full stack trace. This indicates a bug in the code.';
    }
    
    // Return a proper error response to prevent 502
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: details,
        fix: fix,
        type: error?.name || 'Error',
        code: error?.code,
        timestamp: new Date().toISOString()
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