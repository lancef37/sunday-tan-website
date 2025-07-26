/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://sunday-tan-website-production.up.railway.app',
  },
}

module.exports = nextConfig