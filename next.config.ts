// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'ik.imagekit.io', // Add ImageKit domain
      'localhost',
    ],
  },
}

module.exports = nextConfig