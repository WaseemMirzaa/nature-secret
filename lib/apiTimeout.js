/**
 * Single source for API request timeouts (ms). Set in .env:
 * - NEXT_PUBLIC_API_TIMEOUT_MS — inlined in client + available on server (required for browser).
 * - API_TIMEOUT_MS — optional server-only fallback (e.g. RSC fetches) if you prefer not to expose the value name in the client bundle.
 */

const DEFAULT_MS = 120000;

export function getApiRequestTimeoutMs() {
  if (typeof process === 'undefined') return DEFAULT_MS;
  const raw =
    process.env.NEXT_PUBLIC_API_TIMEOUT_MS ||
    process.env.API_TIMEOUT_MS ||
    '';
  const n = Number(String(raw).trim());
  if (Number.isFinite(n) && n >= 5000) return Math.min(n, 300000);
  return DEFAULT_MS;
}
