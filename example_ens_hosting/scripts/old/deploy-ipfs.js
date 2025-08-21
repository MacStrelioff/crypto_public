#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting IPFS deployment process...\n');

// Check if out directory exists
const outDir = path.join(__dirname, '../out');
if (!fs.existsSync(outDir)) {
  console.log('❌ Build directory not found. Please run "npm run build" first.');
  process.exit(1);
}

console.log('✅ Build directory found');

// Check if IPFS is installed
try {
  execSync('ipfs --version', { stdio: 'pipe' });
  console.log('✅ IPFS is installed');
} catch (error) {
  console.log('❌ IPFS is not installed. Please install IPFS Desktop or IPFS CLI.');
  console.log('📥 Download from: https://ipfs.io/docs/install/');
  process.exit(1);
}

// Check if IPFS daemon is running
try {
  execSync('ipfs id', { stdio: 'pipe' });
  console.log('✅ IPFS daemon is running');
} catch (error) {
  console.log('⚠️  IPFS daemon is not running. Starting it...');
  try {
    execSync('ipfs daemon &', { stdio: 'pipe' });
    console.log('✅ IPFS daemon started');
  } catch (daemonError) {
    console.log('❌ Failed to start IPFS daemon. Please start it manually.');
    process.exit(1);
  }
}

// Add the out directory to IPFS
console.log('\n📤 Adding build files to IPFS...');
try {
  const result = execSync('ipfs add -r out', { encoding: 'utf8' });
  const lines = result.trim().split('\n');
  const lastLine = lines[lines.length - 1];
  const hash = lastLine.split(' ')[1];
  
  console.log(`✅ Successfully uploaded to IPFS!`);
  console.log(`🔗 IPFS Hash: ${hash}`);
  console.log(`🌐 View at: https://ipfs.io/ipfs/${hash}`);
  console.log(`🔗 Gateway URL: ipfs://${hash}`);
  
  console.log('\n📝 Next steps:');
  console.log('1. Go to https://app.ens.domains');
  console.log('2. Select your ENS domain');
  console.log('3. Add a Content Record with the IPFS hash above');
  console.log('4. Add a Content Hash Record: ipfs://' + hash);
  
} catch (error) {
  console.log('❌ Failed to upload to IPFS:', error.message);
  process.exit(1);
}
