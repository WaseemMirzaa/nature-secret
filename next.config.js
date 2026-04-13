const path = require('path');
const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const UNSPLASH_PATTERN = { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' };

function getImagesConfig() {
  const raw = process.env.NEXT_PUBLIC_API_URL || '';
  const basePatterns = [
    UNSPLASH_PATTERN,
    { protocol: 'https', hostname: 'img.shields.io', pathname: '/**' },
  ];
  try {
    const u = new URL(raw);
    return {
      // AVIF/WebP + resizing when API host is known (faster loads than full-size unoptimized).
      unoptimized: false,
      formats: ['image/avif', 'image/webp'],
      minimumCacheTTL: 86400,
      /** 480 helps narrow viewports avoid oversized 640px src on slow 4G */
      deviceSizes: [480, 640, 750, 828, 1080, 1200, 1920],
      /** Thumbnails + small UI; include 384 for ~128px logical @3x */
      imageSizes: [32, 48, 64, 96, 128, 256, 384],
      remotePatterns: [
        {
          protocol: u.protocol.replace(':', ''),
          hostname: u.hostname,
          ...(u.port ? { port: u.port } : {}),
          pathname: '/**',
        },
        ...basePatterns,
      ],
    };
  } catch {
    // No valid API URL: still optimize Unsplash (UI mock / placeholders).
    return {
      unoptimized: false,
      formats: ['image/avif', 'image/webp'],
      minimumCacheTTL: 86400,
      deviceSizes: [480, 640, 750, 828, 1080, 1200, 1920],
      imageSizes: [32, 48, 64, 96, 128, 256, 384],
      remotePatterns: basePatterns,
    };
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
