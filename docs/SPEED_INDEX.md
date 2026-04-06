# Speed Index / perceived load (home page)

Changes target **earlier visual completeness** (LCP + main-thread work), not a substitute for fast hosting or CDN.

## What we shipped

1. **LCP image preload (`app/page.js` + `lib/homeLcpPreload.js`)**  
   Server adds `<link rel="preload" as="image" href="…" fetchPriority="high">` for the most likely LCP image:  
   first **in-stock** product’s first image, or else the first **slider** image.  
   Browsers can start the image request in parallel with HTML/CSS.

2. **Below-the-fold code split (`components/HomeBelowFold.js`)**  
   Bestsellers, collections, and brand story are loaded via **`next/dynamic`** with **`ssr: true`**.  
   HTML stays fully rendered for SEO; the **JavaScript** for those sections is in a separate chunk so the **initial** bundle is smaller (less parse/compile before paint).

3. **`decoding="async"`** on key `next/image` instances in the moved sections and hero slider (non-blocking decode where supported).

4. **Collection images** in the split section use **`quality={70}`** and **`loading="lazy"`** (already below the fold).

## What still helps (ops / content)

- **TTFB** and **region** (API + Next host near users).  
- **Image weight** (fewer KB per hero/product image).  
- **No extra third-party scripts** in `<head>`.

## Rollback

- Remove `getHomeLcpPreloadHref` usage and `<link rel="preload">` from `app/page.js`.  
- Inline `HomeBelowFold` back into `HomeContent.js` and delete `components/HomeBelowFold.js` if you want a single chunk again.
