/** @type {import('next').NextConfig} */
function getImagesConfig() {
  const raw = process.env.NEXT_PUBLIC_API_URL || '';
  try {
    const u = new URL(raw);
    return {
      // AVIF/WebP + resizing when API host is known (faster loads than full-size unoptimized).
      unoptimized: false,
      formats: ['image/avif', 'image/webp'],
      minimumCacheTTL: 86400,
      deviceSizes: [640, 750, 828, 1080, 1200, 1920],
      imageSizes: [32, 48, 64, 96, 128, 256],
      remotePatterns: [
        {
          protocol: u.protocol.replace(':', ''),
          hostname: u.hostname,
          ...(u.port ? { port: u.port } : {}),
          pathname: '/**',
        },
      ],
    };
  } catch {
    // No valid API URL at build time: keep previous safe default (direct src, no optimizer fetch).
    return { unoptimized: true };
  }
}

const nextConfig = {
  images: getImagesConfig(),
  compress: true,
  async rewrites() {
    // FCM expects /firebase-messaging-sw.js at origin; serve dynamic SW with env-injected config.
    return [
      {
        source: '/firebase-messaging-sw.js',
        destination: '/api/firebase-messaging-sw',
      },
    ];
  },
};

module.exports = nextConfig;
