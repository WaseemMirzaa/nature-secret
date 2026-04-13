/**
 * Catalog + CMS fixtures without the Nest API.
 * Dev: `npm run dev:mock` or add NEXT_PUBLIC_UI_MOCK=1 to `.env.local`.
 * Production (`next start` / deploy): same flag is ignored unless
 * NEXT_PUBLIC_UI_MOCK_IN_PRODUCTION=1 (staging / demo only — never on a real store).
 */

export function isUiMockMode() {
  if (typeof process === 'undefined') return false;
  const v = process.env.NEXT_PUBLIC_UI_MOCK;
  if (v !== '1' && v !== 'true') return false;
  if (process.env.NODE_ENV === 'production') {
    const allow = process.env.NEXT_PUBLIC_UI_MOCK_IN_PRODUCTION;
    return allow === '1' || allow === 'true';
  }
  return true;
}
