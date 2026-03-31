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
    default:
      return {
        label: e.type || 'Activity',
        detail: productId || e.orderId || path || '—',
      };
  }
}
