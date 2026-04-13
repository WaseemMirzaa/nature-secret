/** In-memory catalog when API is down — development only (see useApiData, HomeContent, fetchHomeServer). */

const HERBAL = '00000000-0000-4000-a000-0000000000c1';
const SKIN = '00000000-0000-4000-a000-0000000000c2';
const img = '/assets/nature-secret-logo.svg';

export function getDevFallbackCategories() {
  return [
    { id: HERBAL, name: 'Herbal oil', slug: 'herbal-oil' },
    { id: SKIN, name: 'Skin care', slug: 'skin-care' },
  ];
}

export function getDevFallbackProducts() {
  return [
    {
      id: '00000000-0000-4000-a000-000000000101',
      name: 'Demo product (local test)',
      slug: 'demo-product',
      categoryId: HERBAL,
      advertisingId: null,
      badge: 'Demo',
      badgeSub: 'Testing',
      price: 10000,
      compareAtPrice: null,
      images: [img],
      imageAlts: null,
      rating: 4.9,
      reviewCount: 12,
      inventory: 99,
      isBestseller: false,
      outOfStock: false,
      description:
        '<p><strong>Local demo.</strong> Start the API on port 4000 and run <code>backend npm run db:setup</code> for real data.</p>',
      variants: [
        { id: '00000000-0000-4000-a000-000000001001', name: '50 ml', volume: '50ml', price: 10000, image: img },
      ],
    },
    {
      id: '00000000-0000-4000-a000-000000000102',
      name: 'Painrex Oil',
      slug: 'nature-secret-px-oil',
      categoryId: HERBAL,
      advertisingId: null,
      badge: 'Bestseller',
      badgeSub: 'Top selling',
      price: 49900,
      description:
        '<p>Development preview. With the API running, this page loads full catalog copy from the database.</p>',
      compareAtPrice: null,
      images: [img],
      imageAlts: null,
      rating: 4.8,
      reviewCount: 37,
      inventory: 100,
      isBestseller: true,
      outOfStock: false,
      variants: [
        { id: '00000000-0000-4000-a000-000000001002', name: '50 ml', volume: '50ml', price: 49900, image: img },
        { id: '00000000-0000-4000-a000-000000001003', name: '100 ml', volume: '100ml', price: 89900, image: img },
      ],
    },
  ];
}
