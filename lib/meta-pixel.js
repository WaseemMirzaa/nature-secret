/**
 * Meta Facebook Pixel — integration placeholder.
 * Uncomment and add to your layout or _document when you have your Pixel ID.
 *
 * 1. Add script to app/layout.js (inside <body>):
 *
 * <Script id="meta-pixel" strategy="afterInteractive">
 *   {`
 *   !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
 *   fbq('init', process.env.NEXT_PUBLIC_META_PIXEL_ID);
 *   fbq('track', 'PageView');
 *   `}
 * </Script>
 *
 * 2. Set env: NEXT_PUBLIC_META_PIXEL_ID=your_pixel_id
 *
 * 3. Conversion API (CAPI): send server-side events from your API/backend using the same event names (ViewContent, AddToCart, InitiateCheckout, Purchase).
 */
