/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: false,
    remotePatterns: [
      { protocol: 'http', hostname: '64.23.180.126', pathname: '/api/**' },
      { protocol: 'http', hostname: '127.0.0.1', pathname: '/api/**' },
      { protocol: 'http', hostname: 'localhost', pathname: '/api/**' },
    ],
  },
};

module.exports = nextConfig;
