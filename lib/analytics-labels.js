/**
 * Human-readable labels for analytics events (for admin analytics UI).
 * @param {Object} e - event from analytics store
 * @param {(id: string) => string} productName - function to get product name by id
 * @returns {{ label: string, detail: string }}
 */
export function getEventLabel(e, productName = (id) => id) {
  const time = e.timestamp ? new Date(e.timestamp).toLocaleString() : '';
  const product = e.productId ? productName(e.productId) : null;
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
        detail: product || e.productId || '—',
      };
    case 'outOfStockClick':
      return {
        label: 'Clicked out-of-stock product',
        detail: product ? `${product} (unavailable)` : e.productId || '—',
      };
    case 'addToCart':
      return {
        label: 'Added to cart',
        detail: product || e.productId || '—',
      };
    case 'purchase':
      return {
        label: 'Placed order',
        detail: e.orderId ? `Order ${e.orderId}` : '—',
      };
    default:
      return {
        label: e.type || 'Activity',
        detail: product || e.orderId || path || '—',
      };
  }
}
