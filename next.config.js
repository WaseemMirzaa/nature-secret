const path = require('path');
const webpack = require('webpack');

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
  /** Inlines critical CSS + defers full stylesheet (Critters). Prod only; improves LCP. Not related to analytics. */
  experimental: {
    optimizeCss: true,
  },
  images: getImagesConfig(),
  compress: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      const stub = path.join(__dirname, 'lib/next-modern-browser-polyfill.js');
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /[\\/]next[\\/]dist[\\/]build[\\/]polyfills[\\/]polyfill-module\.js$/,
          stub,
        ),
      );
    }
    return config;
  },
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
