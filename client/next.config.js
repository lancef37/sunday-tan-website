/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  // Image optimization (if using Next.js Image component)
  images: {
    domains: ['sunday-tan-website.vercel.app'],
  },
}

module.exports = nextConfig