import { Opportunity } from '@/types';
import { parseCSV, normalizeOpportunity } from './csvParser';
import { getAdminStorage } from './firebaseAdmin';

/**
 * Load SAM.gov opportunities from Firebase Storage CSV file
 */
export async function loadSAMGovFromCSV(params: {
  limit?: number;
  keyword?: string;
}): Promise<Opportunity[]> {
  try {
    console.log('[SAM.gov CSV] Loading opportunities from Firebase Storage...');
    
    // Check for required environment variables
    if (!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
      console.warn('[SAM.gov CSV] Firebase Storage bucket not configured');
      return [];
    }
    
    // Check for Firebase Admin credentials
    if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      console.warn('[SAM.gov CSV] Firebase Admin credentials not configured. SAM.gov CSV will not be loaded.');
      return [];
    }
    
    const storage = getAdminStorage();
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'therfpqueen-f11fd.firebasestorage.app';
    const cleanBucketName = bucketName.replace(/^gs:\/\//, '').split('/')[0];
    
    console.log(`[SAM.gov CSV] Using bucket: ${cleanBucketName}`);
    
    const bucket = storage.bucket(cleanBucketName);
    
    // Look for the ContractOpportunitiesFullCSV.csv file
    const fileName = 'exports/ContractOpportunitiesFullCSV.csv';
    const file = bucket.file(fileName);
    
    // Check if file exists
    let exists = false;
    try {
      [exists] = await file.exists();
    } catch (error: any) {
      // Handle permission errors gracefully
      if (error.code === 7 || error.code === 403 || 
          error.message?.includes('permission') || 
          error.message?.includes('Permission') ||
          error.message?.includes('insufficient permissions')) {
        console.warn(`[SAM.gov CSV] Permission denied accessing ${fileName}.`);
        console.warn(`[SAM.gov CSV] Error code: ${error.code}, Message: ${error.message}`);
        console.warn(`[SAM.gov CSV] To fix: Grant "Storage Object Viewer" or "Storage Admin" role to your service account in Google Cloud Console → IAM & Admin`);
        return [];
      }
      console.error(`[SAM.gov CSV] Error checking file existence:`, error);
      throw error;
    }
    
    if (!exists) {
      console.warn(`[SAM.gov CSV] File not found: ${fileName}`);
      console.warn(`[SAM.gov CSV] Make sure the file exists at: gs://${cleanBucketName}/${fileName}`);
      return [];
    }
    
    // Download and parse the CSV
    let fileContent: Buffer;
    try {
      [fileContent] = await file.download();
    } catch (downloadError: any) {
      // Handle permission errors gracefully
      if (downloadError.code === 7 || downloadError.code === 403 || 
          downloadError.message?.includes('permission') || 
          downloadError.message?.includes('Permission') ||
          downloadError.message?.includes('insufficient permissions')) {
        console.warn(`[SAM.gov CSV] Permission denied downloading ${fileName}.`);
        console.warn(`[SAM.gov CSV] Error code: ${downloadError.code}, Message: ${downloadError.message}`);
        console.warn(`[SAM.gov CSV] To fix: Grant "Storage Object Viewer" or "Storage Admin" role to your service account in Google Cloud Console → IAM & Admin`);
        return [];
      }
      console.error(`[SAM.gov CSV] Error downloading file:`, downloadError);
      throw downloadError;
    }
    
    const csvContent = fileContent.toString('utf-8');
    
    console.log(`[SAM.gov CSV] Downloaded file, size: ${fileContent.length} bytes`);
    
    // Parse CSV
    const rows = parseCSV(csvContent);
    console.log(`[SAM.gov CSV] Parsed ${rows.length} rows from CSV`);
    
    // Normalize opportunities
    const opportunities: Opportunity[] = [];
    const limit = params.limit || 1000;
    const keyword = (params.keyword || '').toLowerCase();
    
    for (const row of rows) {
      try {
        const opportunity = normalizeOpportunity(row, 'SAM');
        
        // Filter by keyword if provided
        if (keyword && !opportunity.title.toLowerCase().includes(keyword) && 
            !opportunity.description.toLowerCase().includes(keyword)) {
          continue;
        }
        
        // Only add if it has a title and URL
        if (opportunity.title && opportunity.title.trim().length > 0 &&
            opportunity.url && opportunity.url.trim() !== '' && 
            opportunity.url !== 'N/A' && opportunity.url !== 'n/a') {
          opportunities.push(opportunity);
          
          if (opportunities.length >= limit) {
            break;
          }
        }
      } catch (err) {
        // Skip invalid rows
        console.warn('[SAM.gov CSV] Error normalizing row:', err);
      }
    }
    
    console.log(`[SAM.gov CSV] Loaded ${opportunities.length} opportunities from CSV`);
    return opportunities;
  } catch (error) {
    console.error('[SAM.gov CSV] Error loading opportunities from CSV:', error);
    return [];
  }
}

