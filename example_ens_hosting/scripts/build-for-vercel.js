const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building for Vercel...');

try {
  // Run the Next.js build
  execSync('next build', { stdio: 'inherit' });
  
  // Check if routes-manifest.json exists in .next directory
  const routesManifestPath = path.join('.next', 'routes-manifest.json');
  const outRoutesManifestPath = path.join('out', 'routes-manifest.json');
  
  if (fs.existsSync(routesManifestPath)) {
    // Copy routes-manifest.json to out directory
    fs.copyFileSync(routesManifestPath, outRoutesManifestPath);
    console.log('✅ Copied routes-manifest.json to out directory');
  } else {
    console.log('⚠️  routes-manifest.json not found in .next directory');
  }
  
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
