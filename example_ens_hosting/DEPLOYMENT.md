# ENS Domain Deployment Guide

This guide will walk you through deploying your web app to your ENS domain.

## Prerequisites

1. **ENS Domain**: You need to own an ENS domain (e.g., `yourname.eth`)
2. **Web3 Wallet**: MetaMask or similar wallet with some ETH for gas fees
3. **IPFS**: Either IPFS Desktop or access to a pinning service

## Step 1: Build Your Application

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

This creates a static export in the `out/` directory.

## Step 2: Deploy to IPFS

### Option A: Using the Deployment Script

```bash
# Make sure you have IPFS installed and running
npm run deploy:ipfs
```

### Option B: Manual IPFS Upload

1. **Install IPFS Desktop** from [ipfs.io](https://ipfs.io/docs/install/)
2. **Start IPFS Desktop**
3. **Drag the `out/` folder** to IPFS Desktop
4. **Copy the IPFS hash** (starts with `Qm...`)

### Option C: Using Pinata (Recommended for beginners)

1. Go to [pinata.cloud](https://pinata.cloud)
2. Create an account
3. Upload the `out/` folder
4. Copy the IPFS hash

## Step 3: Configure ENS Records

1. **Go to [app.ens.domains](https://app.ens.domains)**
2. **Connect your wallet**
3. **Select your ENS domain**
4. **Add the following records:**

### Content Record (TXT)
- **Name**: `_ens`
- **Value**: Your IPFS hash (e.g., `QmX...`)

### Content Hash Record
- **Type**: Content Hash
- **Value**: `ipfs://YOUR_IPFS_HASH`

### Optional Records
- **Avatar**: Upload a profile picture
- **Social Links**: Add Twitter, GitHub, etc.
- **Email**: Set contact email

## Step 4: Test Your Domain

1. **Wait for propagation** (can take up to 24 hours)
2. **Test using a gateway**:
   - `https://ipfs.io/ipfs/YOUR_HASH`
   - `https://gateway.pinata.cloud/ipfs/YOUR_HASH`
3. **Test your ENS domain**: `yourname.eth.link`

## Alternative Deployment Options

### Fleek (Recommended for continuous deployment)

1. **Push your code to GitHub**
2. **Go to [fleek.co](https://fleek.co)**
3. **Connect your GitHub repository**
4. **Configure build settings**:
   - Build Command: `npm run build`
   - Publish Directory: `out`
5. **Deploy** - Fleek will automatically deploy to IPFS

### Vercel/Netlify (Traditional hosting)

1. **Push to GitHub**
2. **Connect to Vercel/Netlify**
3. **Configure ENS** to point to your domain:
   - Content Record: `https://your-app.vercel.app`
   - Content Hash: `http://your-app.vercel.app`

## Troubleshooting

### Common Issues

1. **Domain not resolving**:
   - Check ENS records are correct
   - Wait for propagation (up to 24 hours)
   - Verify IPFS hash is correct

2. **IPFS content not loading**:
   - Ensure content is pinned
   - Try different gateways
   - Check for CORS issues

3. **Build errors**:
   - Check all dependencies are installed
   - Verify TypeScript errors
   - Ensure Next.js config is correct

### Testing Your Setup

```bash
# Test IPFS hash directly
curl https://ipfs.io/ipfs/YOUR_HASH

# Test ENS resolution
npx ens-check yourname.eth
```

## Security Considerations

1. **Pin your content** to multiple IPFS nodes
2. **Use a reliable pinning service** (Pinata, Fleek, etc.)
3. **Keep your private keys secure**
4. **Consider using IPNS** for dynamic content

## Resources

- [ENS Documentation](https://docs.ens.domains/)
- [IPFS Documentation](https://docs.ipfs.io/)
- [Fleek Documentation](https://docs.fleek.co/)
- [Pinata Documentation](https://docs.pinata.cloud/)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review ENS and IPFS documentation
3. Join ENS Discord for community support
