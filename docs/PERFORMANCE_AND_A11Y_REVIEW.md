# Performance & accessibility changes (review)

Non-breaking updates aligned with PageSpeed / PSI feedback for `naturesecret.pk`. No API or database changes; storefront UI and head tags only.

## 1. Resource hints (LCP / connection setup)

- **`app/layout.js`**: If `NEXT_PUBLIC_API_URL` is a valid URL, the document `<head>` now includes:
  - `<link rel="preconnect" href="https://api.…" crossorigin />` — starts TLS + connection to your API host early (helps image requests and API calls).
  - `<link rel="dns-prefetch" href="https://api.…" />` — fallback hint for older paths.
- **Origin** is derived from env at build/runtime (same host you already use for `next/image` remote patterns). If the env is missing or invalid, nothing is injected.

## 2. Font loading

- **`app/layout.js`**: `Inter` from `next/font/google` now uses **`display: 'swap'`** so text stays visible while the font loads (reduces invisible-text period; no layout change to your design).

## 3. Render-blocking CSS (scope)

- Next.js **bundles global CSS** (`globals.css` + Tailwind) into hashed files like `d3dff1408ab76de7.css`. **We did not** defer or split that bundle: doing so without a full critical-CSS pipeline risks **FOUC** (unstyled flash) on production.
- **Follow-up (optional, larger project)**: critical CSS extraction or route-level CSS splitting with visual QA on every template.

## 4. CLS — logo dimensions

- **`components/Logo.js`**: The logo `<img>` now has explicit **`width` / `height`** (from the SVG `viewBox` aspect ratio) so the browser can reserve space before paint. Styling is still via existing `className` (e.g. `h-8`).

> Product grids and PDP already used `next/image` with **width/height** or **fill** inside **aspect-ratio** containers; those patterns are unchanged.

## 5. Animations (mobile / compositing)

- **`tailwind.config.js`**: `goldPulse`, `ctaAttract`, `ctaPulse`, and `ctaGlow` keyframes were **rewritten to avoid animating `box-shadow`** (expensive on many mobile GPUs). Pulses now use **`transform` / `opacity`** only so work stays on the compositor where possible.
- **Visual change**: Slightly subtler “glow” on pulsing CTAs (no animated shadow ring). Buttons keep their static shadows from Tailwind classes on the elements.

## 6. Contrast (accessibility / readability)

- **Strikethrough “compare at” prices** and **secondary meta text** on the customer storefront were bumped from **`text-neutral-400`** → **`text-neutral-500`** (and trust line in footer to **`text-neutral-600`**) so small text on white is easier to read in bright light.
- **Files touched**: `Footer.js`, `ProductDetailClient.js`, `app/shop/page.js`, `HomeContent.js`, `app/checkout/page.js`, `CartDrawer.js`.
- **Admin** and internal tools were left as-is to limit scope.

## 7. JavaScript bundle (legacy / unused)

- No `next.config` or Babel changes were made: changing transpilation targets can break older browsers or dependencies without a full regression pass.
- Next.js already **splits routes** by default; further wins need bundle analysis (e.g. `@next/bundle-analyzer`) as a separate task.

## Deploy checklist

1. Ensure **`NEXT_PUBLIC_API_URL`** is set in the production build so **preconnect** targets the real API host.
2. Redeploy the **frontend** after merging (env + hashed assets).
3. Re-run PSI (mobile + desktop) after deploy; LCP is also sensitive to **image bytes**, **TTFB**, and **CDN**, not only front-end hints.

## Rollback

- Revert the listed files in one commit; no migrations or env renames required.
