// Node.js script to set Vercel environment variables from .env.local
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Vercel environment variables...\n');

const envPath = path.join(__dirname, '..', '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

let success = 0;
let skipped = 0;

for (const line of lines) {
  const trimmed = line.trim();
  
  // Skip comments and empty lines
  if (!trimmed || trimmed.startsWith('#')) continue;
  
  const match = trimmed.match(/^([^=]+)=(.*)$/);
  if (!match) continue;
  
  const key = match[1].trim();
  let value = match[2].trim();
  
  // Remove quotes
  value = value.replace(/^["'](.*)["']$/, '$1');
  
  // Skip if value is empty
  if (!value) {
    console.log(`  Skipping ${key} (empty value)`);
    skipped++;
    continue;
  }
  
  process.stdout.write(`  Setting ${key}... `);
  
  try {
    // Set for all environments
    execSync(`vercel env add ${key} production`, {
      input: value + '\n',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    console.log('✅');
    success++;
  } catch (error) {
    // Variable might already exist
    console.log('⚠️  (may already exist)');
    skipped++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`  ✅ Set: ${success}`);
console.log(`  ⚠️  Skipped: ${skipped}`);
console.log('\n✨ Environment variables setup complete!');
console.log('   Run "vercel --prod" to deploy your app.\n');

