/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Avoid 502: _next/image optimizer fetching same-origin API images can fail on the server.
    // With unoptimized, browser loads image URLs directly (Nginx proxies /api to backend).
    unoptimized: true,
  },
};

module.exports = nextConfig;
