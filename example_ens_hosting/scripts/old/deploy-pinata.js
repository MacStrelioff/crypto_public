const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

console.log('🚀 Uploading to Pinata IPFS...');

// You'll need to get these from Pinata dashboard
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
  console.log('❌ Please set PINATA_API_KEY and PINATA_SECRET_KEY environment variables');
  console.log('📝 Get them from: https://app.pinata.cloud/developers/api-keys');
  process.exit(1);
}

async function uploadToPinata() {
  try {
    const formData = new FormData();
    
    // Add the entire out directory
    const outDir = path.join(__dirname, '../out');
    formData.append('file', fs.createReadStream(path.join(outDir, 'index.html')), {
      filepath: 'index.html'
    });
    
    // Add other files in the out directory
    const files = fs.readdirSync(outDir);
    files.forEach(file => {
      if (file !== 'index.html') {
        const filePath = path.join(outDir, file);
        if (fs.statSync(filePath).isFile()) {
          formData.append('file', fs.createReadStream(filePath), {
            filepath: file
          });
        }
      }
    });

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY,
        ...formData.getHeaders()
      },
      body: formData
    });

    const result = await response.json();
    
    if (result.IpfsHash) {
      console.log(`✅ Successfully uploaded to IPFS!`);
      console.log(`🔗 IPFS Hash: ${result.IpfsHash}`);
      console.log(`🌐 View at: https://ipfs.io/ipfs/${result.IpfsHash}`);
      console.log(`🔗 Gateway URL: ipfs://${result.IpfsHash}`);
      
      console.log('\n📝 Next steps:');
      console.log('1. Go to https://app.ens.domains');
      console.log('2. Select your ENS domain');
      console.log('3. Add Content Hash Record: ipfs://' + result.IpfsHash);
    } else {
      console.log('❌ Upload failed:', result);
    }
  } catch (error) {
    console.error('❌ Error uploading to Pinata:', error.message);
  }
}

uploadToPinata();
