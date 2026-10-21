/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow running a second dev server without sharing the same .next cache
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    domains: ['images.clerk.dev', 'img.clerk.com', 'lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig