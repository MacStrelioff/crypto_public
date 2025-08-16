/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove static export for Vercel deployment
  images: {
    unoptimized: true
  },
}

module.exports = nextConfig
