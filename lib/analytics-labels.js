const SESSION_BREAKDOWN_ORDER = [
  'pageView',
  'productView',
  'outOfStockClick',
  'addToCart',
  'addToWishlist',
  'initiateCheckout',
  'checkoutPageView',
  'placeOrderClick',
  'purchase',
  'orderConfirmationView',
];

const SESSION_BREAKDOWN_LABEL = {
  pageView: 'Page',
  productView: 'Product',
  outOfStockClick: 'OOS',
  addToCart: 'Cart',
  addToWishlist: 'Wishlist',
  initiateCheckout: 'Checkout start',
  checkoutPageView: 'Checkout view',
  placeOrderClick: 'Order click',
  purchase: 'Purchase',
  orderConfirmationView: 'Order confirm',
};

/** Compact per-session funnel string for admin tables. */
export function formatSessionEventBreakdown(events) {
  if (!Array.isArray(events) || !events.length) return '';
  const counts = {};
  for (const e of events) {
    const t = e.type || 'unknown';
    counts[t] = (counts[t] || 0) + 1;
  }
  const parts = [];
  for (const t of SESSION_BREAKDOWN_ORDER) {
    if (counts[t]) parts.push(`${SESSION_BREAKDOWN_LABEL[t] || t}×${counts[t]}`);
  }
  for (const t of Object.keys(counts).sort()) {
    if (!SESSION_BREAKDOWN_ORDER.includes(t)) parts.push(`${t}×${counts[t]}`);
  }
  return parts.join(' · ');
}

/**
 * Labels for admin analytics UI. Product-related detail uses content id (advertising id), not names.
 * @param {Object} e - event from analytics store
 * @param {(id: string) => string} resolveProductId - map legacy uuid key to display id if needed
 */
export function getEventLabel(e, resolveProductId = (id) => id) {
  const pid = e.contentId || e.productId;
  const productId = pid ? resolveProductId(pid) : null;
  const path = e.path || '';
  const pathLabel = path === '/' ? 'Home' : path === '/shop' ? 'Shop' : path.startsWith('/shop/') ? 'Product page' : path === '/blog' ? 'Blog' : path === '/checkout' ? 'Checkout' : path ? path : '';

  switch (e.type) {
    case 'pageView':
      return {
        label: 'Viewed page',
        detail: pathLabel || path || '—',
      };
    case 'productView':
      return {
        label: 'Viewed product',
        detail: productId || pid || '—',
      };
    case 'outOfStockClick':
      return {
        label: 'Clicked out-of-stock product',
        detail: productId || pid ? `${productId || pid} (unavailable)` : '—',
      };
    case 'addToCart':
      return {
        label: 'Added to cart',
        detail: productId || pid || '—',
      };
    case 'addToWishlist':
      return {
        label: 'Added to wishlist',
        detail: productId || pid || '—',
      };
    case 'purchase':
      return {
        label: 'Placed order',
        detail: e.orderId ? `Order ${e.orderId}` : '—',
      };
    case 'initiateCheckout':
      return {
        label: 'Started checkout',
        detail: pathLabel || path || '—',
      };
    case 'checkoutPageView':
      return {
        label: 'Opened checkout',
        detail: pathLabel || path || '—',
      };
    case 'placeOrderClick':
      return {
        label: 'Clicked place order',
        detail: pathLabel || path || '—',
      };
    case 'orderConfirmationView':
      return {
        label: 'Saw order confirmation',
        detail: e.orderId ? `Order ${e.orderId}` : '—',
      };
    default:
      return {
        label: e.type || 'Activity',
        detail: productId || e.orderId || path || '—',
      };
  }
}
