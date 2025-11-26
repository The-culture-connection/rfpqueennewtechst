#!/usr/bin/env node

/**
 * Script to properly format Firebase private key for Vercel
 * 
 * Usage:
 *   node format-firebase-key.js path/to/service-account-key.json
 * 
 * This will output the properly formatted FIREBASE_PRIVATE_KEY value
 * that you can copy directly into Vercel environment variables
 */

const fs = require('fs');
const path = require('path');

// Get the service account key file path from command line
const keyFilePath = process.argv[2];

if (!keyFilePath) {
  console.error('❌ Error: Please provide the path to your service account key file');
  console.error('');
  console.error('Usage:');
  console.error('  node format-firebase-key.js path/to/service-account-key.json');
  console.error('');
  console.error('Example:');
  console.error('  node format-firebase-key.js ~/Downloads/my-project-firebase-adminsdk.json');
  process.exit(1);
}

// Check if file exists
if (!fs.existsSync(keyFilePath)) {
  console.error(`❌ Error: File not found: ${keyFilePath}`);
  process.exit(1);
}

try {
  // Read and parse the service account key
  const serviceAccount = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
  
  console.log('✅ Service account key loaded successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Copy these values to your Vercel environment variables:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('FIREBASE_PROJECT_ID:');
  console.log(serviceAccount.project_id);
  console.log('');
  
  console.log('FIREBASE_CLIENT_EMAIL:');
  console.log(serviceAccount.client_email);
  console.log('');
  
  console.log('FIREBASE_PRIVATE_KEY:');
  console.log(serviceAccount.private_key);
  console.log('');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  IMPORTANT NOTES:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('1. The private key above is already in the correct format');
  console.log('2. Copy it EXACTLY as shown (including quotes and \\n)');
  console.log('3. In Vercel CLI: paste it when prompted');
  console.log('4. In Vercel Dashboard: paste into the value field');
  console.log('5. Do NOT modify or reformat the key\n');
  
  // Additional validation
  if (!serviceAccount.private_key.includes('\\n')) {
    console.warn('⚠️  WARNING: Private key does not contain \\n characters.');
    console.warn('   This might cause issues. Make sure to preserve them!\n');
  }
  
  if (!serviceAccount.private_key.startsWith('"-----BEGIN PRIVATE KEY-----')) {
    console.warn('⚠️  WARNING: Private key format looks unusual.');
    console.warn('   Expected format: "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"\n');
  }
  
} catch (error) {
  console.error('❌ Error reading or parsing service account key:');
  console.error(error.message);
  process.exit(1);
}



