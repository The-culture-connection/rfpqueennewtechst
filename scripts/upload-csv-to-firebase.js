// Upload CSV files from Opportunities folder to Firebase Storage
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if it exists
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log('✅ Loaded environment variables from .env.local');
} else {
  console.log('⚠️  No .env.local found, using environment variables');
}

// Initialize Firebase Admin
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

if (!projectId || !clientEmail || !privateKey || !storageBucket) {
  console.error('❌ Missing required environment variables:');
  if (!projectId) console.error('  - NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  if (!clientEmail) console.error('  - FIREBASE_CLIENT_EMAIL');
  if (!privateKey) console.error('  - FIREBASE_PRIVATE_KEY');
  if (!storageBucket) console.error('  - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
  process.exit(1);
}

// Handle private key formatting
privateKey = privateKey.replace(/\\n/g, '\n');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  }),
  storageBucket,
});

const bucket = admin.storage().bucket();
const opportunitiesDir = path.join(__dirname, '..', 'Opportunities');

async function uploadCSVFiles() {
  console.log('\n📦 Starting CSV upload to Firebase Storage...\n');
  
  try {
    const files = fs.readdirSync(opportunitiesDir);
    const csvFiles = files.filter(file => file.endsWith('.csv'));
    
    console.log(`Found ${csvFiles.length} CSV files to upload:\n`);
    
    let uploaded = 0;
    let failed = 0;
    
    for (const file of csvFiles) {
      const localPath = path.join(opportunitiesDir, file);
      const remotePath = `exports/${file}`;
      
      try {
        const stats = fs.statSync(localPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        process.stdout.write(`  Uploading ${file} (${sizeMB} MB)... `);
        
        await bucket.upload(localPath, {
          destination: remotePath,
          metadata: {
            contentType: 'text/csv',
            metadata: {
              uploadedAt: new Date().toISOString(),
              originalName: file,
            },
          },
        });
        
        console.log('✅ Done');
        uploaded++;
      } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
        failed++;
      }
    }
    
    console.log(`\n📊 Upload Summary:`);
    console.log(`  ✅ Uploaded: ${uploaded}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  📁 Total: ${csvFiles.length}`);
    
    if (uploaded > 0) {
      console.log(`\n🎉 Successfully uploaded ${uploaded} CSV file(s) to Firebase Storage!`);
      console.log(`   Files are available at: gs://${storageBucket}/exports/`);
    }
    
  } catch (error) {
    console.error('\n❌ Error during upload:', error);
    process.exit(1);
  }
}

uploadCSVFiles()
  .then(() => {
    console.log('\n✨ Upload complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Upload failed:', error);
    process.exit(1);
  });

