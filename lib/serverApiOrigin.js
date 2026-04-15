/**
 * Origin for server-side fetch() to the Nest API (RSC, generateMetadata, etc.).
 * Prefer INTERNAL_API_URL on the same host as Next (e.g. http://127.0.0.1:4000) so requests skip
 * public DNS, TLS to the edge, and reverse-proxy hairpin — lower TTFB than NEXT_PUBLIC_API_URL alone.
 * Not bundled for the browser; safe to keep server-only.
 */
export function getServerApiOrigin() {
  const internal = typeof process.env.INTERNAL_API_URL === 'string' ? process.env.INTERNAL_API_URL.trim() : '';
  if (internal) return internal.replace(/\/$/, '');
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
}
