/**
 * Replaces next/dist/build/polyfills/polyfill-module when targeting modern browsers
 * (see package.json browserslist). Only URL.canParse may still be missing on older
 * supported Chromium (before ~120); the rest are native.
 */
if (typeof URL !== 'undefined' && !('canParse' in URL)) {
  URL.canParse = function (input, base) {
    try {
      return Boolean(new URL(input, base));
    } catch {
      return false;
    }
  };
}
