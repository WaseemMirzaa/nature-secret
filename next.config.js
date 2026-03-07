/** @type {import('next').NextConfig} */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
const assetPrefix = siteUrl ? siteUrl.replace(/\/$/, '') : '';

const nextConfig = {
  output: 'standalone',
  assetPrefix: assetPrefix || undefined,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, no-cache, max-age=0, must-revalidate' }],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
};

module.exports = nextConfig;
