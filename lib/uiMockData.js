/**
 * Rich fixtures when NEXT_PUBLIC_UI_MOCK=1. Product images are remote Unsplash (see next.config remotePatterns).
 */

const HERBAL = '00000000-0000-4000-a000-0000000000c1';
const SKIN = '00000000-0000-4000-a000-0000000000c2';

/** Stable Unsplash URLs — skincare / oils / spa (w=900 for sharp cards) */
const U = {
  oil1: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=900&q=82&auto=format&fit=crop',
  oil2: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=900&q=82&auto=format&fit=crop',
  serum: 'https://images.unsplash.com/photo-1620912189865-1c57b5e29de6?w=900&q=82&auto=format&fit=crop',
  cream: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=900&q=82&auto=format&fit=crop',
  bottle: 'https://images.unsplash.com/photo-1570194065650-d99fb4b38b14?w=900&q=82&auto=format&fit=crop',
  routine: 'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?w=900&q=82&auto=format&fit=crop',
  hands: 'https://images.unsplash.com/photo-1596755094514-f87e34085b8c?w=900&q=82&auto=format&fit=crop',
  hero1: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=1400&q=82&auto=format&fit=crop',
  hero2: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1400&q=82&auto=format&fit=crop',
};

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

const RAW_CATEGORIES = [
  { id: HERBAL, name: 'Herbal oils', slug: 'herbal-oil', advertisingId: null },
  { id: SKIN, name: 'Skin care', slug: 'skin-care', advertisingId: null },
];

const RAW_PRODUCTS = [
  {
    id: '00000000-0000-4000-a000-000000000101',
    name: 'Nature Secret PX Oil — 50 ml',
    slug: 'nature-secret-px-oil',
    categoryId: HERBAL,
    advertisingId: null,
    badge: 'Bestseller',
    badgeSub: 'Relaxing massage oil for your unwind ritual.',
    price: 49900,
    compareAtPrice: 59900,
    images: [U.oil1, U.bottle],
    imageAlts: ['Botanical body oil', 'Amber glass bottle'],
    rating: 4.9,
    reviewCount: 48,
    inventory: 80,
    isBestseller: true,
    outOfStock: false,
    benefits: ['Botanical oils', 'Light texture', 'Evening ritual'],
    faq: [
      { q: 'How do I use this oil?', a: 'Warm a small amount in your palms and massage onto clean skin.' },
      { q: 'External use only?', a: 'Yes — cosmetic body oil for external use.' },
    ],
    description:
      '<p><strong>Premium botanical body oil</strong> for a calm massage ritual. Mock data for local UI.</p><ul><li>External use only</li><li>Patch test if sensitive</li></ul>',
    variants: [
      { id: '00000000-0000-4000-a000-000000001001', name: '50 ml', volume: '50ml', price: 49900, compareAtPrice: 59900, image: U.oil1 },
      { id: '00000000-0000-4000-a000-000000001002', name: '100 ml', volume: '100ml', price: 89900, compareAtPrice: 99900, image: U.oil2 },
    ],
  },
  {
    id: '00000000-0000-4000-a000-000000000102',
    name: 'Calm Body Oil',
    slug: 'calm-body-oil',
    categoryId: HERBAL,
    badge: 'New',
    badgeSub: null,
    price: 34900,
    compareAtPrice: null,
    images: [U.oil2],
    imageAlts: ['Body oil dropper'],
    rating: 4.7,
    reviewCount: 12,
    inventory: 40,
    isBestseller: false,
    outOfStock: false,
    benefits: ['Jojoba', 'Vitamin E'],
    description: '<p>Light daily body oil — mock listing.</p>',
    variants: [{ id: '00000000-0000-4000-a000-000000001010', name: '100 ml', volume: '100ml', price: 34900, image: U.oil2 }],
  },
  {
    id: '00000000-0000-4000-a000-000000000103',
    name: 'Night Serum',
    slug: 'night-serum',
    categoryId: SKIN,
    badge: null,
    badgeSub: 'For PM routines',
    price: 62900,
    compareAtPrice: 69900,
    images: [U.serum, U.hands],
    imageAlts: ['Serum bottle', 'Skincare routine'],
    rating: 4.8,
    reviewCount: 22,
    inventory: 0,
    isBestseller: false,
    outOfStock: true,
    benefits: ['Hyaluronic acid', 'Niacinamide'],
    description: '<p>Night serum — mock shows out of stock.</p>',
    variants: [{ id: '00000000-0000-4000-a000-000000001020', name: '30 ml', volume: '30ml', price: 62900, compareAtPrice: 69900, image: U.serum }],
  },
  {
    id: '00000000-0000-4000-a000-000000000104',
    name: 'Daily Moisturizer',
    slug: 'daily-moisturizer',
    categoryId: SKIN,
    badge: 'Sale',
    badgeSub: null,
    price: 27900,
    compareAtPrice: 34900,
    images: [U.cream],
    imageAlts: ['Face cream jar'],
    rating: 4.5,
    reviewCount: 9,
    inventory: 100,
    isBestseller: false,
    outOfStock: false,
    description: '<p>Face moisturizer mock.</p>',
    variants: [{ id: '00000000-0000-4000-a000-000000001030', name: '50 ml', price: 27900, compareAtPrice: 34900, image: U.cream }],
  },
  {
    id: '00000000-0000-4000-a000-000000000105',
    name: 'Hand Cream',
    slug: 'hand-cream',
    categoryId: SKIN,
    badge: null,
    badgeSub: null,
    price: 18900,
    compareAtPrice: null,
    images: [U.routine],
    imageAlts: ['Hand care'],
    rating: 4.6,
    reviewCount: 5,
    inventory: 200,
    isBestseller: false,
    outOfStock: false,
    description: '<p>Rich hand cream — mock.</p>',
    variants: [{ id: '00000000-0000-4000-a000-000000001040', name: '75 ml', price: 18900, image: U.routine }],
  },
  {
    id: '00000000-0000-4000-a000-000000000106',
    name: 'Travel Kit',
    slug: 'travel-kit',
    categoryId: HERBAL,
    badge: 'Bundle',
    badgeSub: 'Mini sizes',
    price: 119900,
    compareAtPrice: null,
    images: [U.bottle, U.serum],
    imageAlts: ['Travel kit', 'Serum'],
    rating: 5,
    reviewCount: 3,
    inventory: 15,
    isBestseller: false,
    outOfStock: false,
    description: '<p>Travel-sized picks — mock bundle.</p>',
    variants: [
      { id: '00000000-0000-4000-a000-000000001051', name: 'Set A', price: 119900, image: U.bottle },
      { id: '00000000-0000-4000-a000-000000001052', name: 'Set B', price: 129900, image: U.serum },
    ],
  },
];

const MOCK_REVIEWS_PX = [
  { id: 'mock-rv-1', authorName: 'Ayesha K.', rating: 5, body: 'Lovely texture and absorbs well.', media: [] },
  { id: 'mock-rv-2', authorName: 'Hassan M.', rating: 5, body: 'Ordered COD — arrived within a week.', media: [] },
  { id: 'mock-rv-3', authorName: 'Sara L.', rating: 4, body: 'Good quality; would buy the larger size next time.', media: [] },
];

const RAW_SLIDER = [
  { id: 'mock-slide-1', imageUrl: U.hero1, alt: 'Botanical care', title: 'Shop botanical care', href: '/shop' },
  { id: 'mock-slide-2', imageUrl: U.hero2, alt: 'Self care', title: 'Read the journal', href: '/blog' },
];

const RAW_HOME_CONTENT = {
  homeHeroIntro:
    'UI mock mode: full catalog with photos — set NEXT_PUBLIC_UI_MOCK=0 for real API data in dev.',
  homeStoryLabel: 'Our story',
  homeStoryHeading: 'Crafted with care — mock preview',
  homeStoryHtml:
    '<p>Mock CMS content for layout. <strong>Production</strong> loads real settings from your backend.</p>',
};

const RAW_BLOG = [
  {
    id: 'mock-blog-1',
    slug: 'mock-routine-evening-oil',
    template: 'routine',
    title: 'Evening oil ritual (mock)',
    excerpt: 'Layer body oil without heaviness — preview.',
    publishedAt: new Date('2026-01-15T10:00:00Z').toISOString(),
    readTimeMinutes: 4,
    image: U.routine,
    imageAlt: 'Routine',
    author: { name: 'Nature Secret' },
    body: '<p>Mock journal content for typography.</p>',
    relatedProductIds: ['00000000-0000-4000-a000-000000000101'],
  },
  {
    id: 'mock-blog-2',
    slug: 'mock-ingredient-spotlight',
    template: 'ingredient-spotlight',
    title: 'Ingredient spotlight (mock)',
    excerpt: 'Short mock excerpt.',
    publishedAt: new Date('2026-02-01T12:00:00Z').toISOString(),
    readTimeMinutes: 6,
    image: U.serum,
    imageAlt: 'Ingredients',
    author: { name: 'Editorial' },
    body: '<p>Mock body copy.</p>',
    relatedProductIds: [],
  },
];

const RAW_CONTENT_SETTINGS = {
  ...RAW_HOME_CONTENT,
  productDisclaimerTitle: 'Important (mock)',
  productDisclaimerText: 'Cosmetic preview only — not medical advice.',
  footerDisclaimer: 'Mock footer disclaimer for layout.',
};

export function getUiMockCategories() {
  return clone(RAW_CATEGORIES);
}

export function getUiMockProducts(params = {}) {
  let list = clone(RAW_PRODUCTS);
  if (params.categoryId) {
    const cid = String(params.categoryId);
    list = list.filter((p) => String(p.categoryId) === cid);
  }
  return list;
}

export function findUiMockProduct(slugOrId) {
  if (!slugOrId) return null;
  const s = String(slugOrId);
  return RAW_PRODUCTS.find((p) => p.id === s || (p.slug && p.slug === s)) || null;
}

export function getUiMockReviewsForProduct(productId) {
  if (!productId) return [];
  if (String(productId) === '00000000-0000-4000-a000-000000000101') return clone(MOCK_REVIEWS_PX);
  return clone([MOCK_REVIEWS_PX[0]]);
}

export function getUiMockSlider() {
  return clone(RAW_SLIDER);
}

export function getUiMockHomeContent() {
  return clone(RAW_HOME_CONTENT);
}

export function getUiMockContentSettings() {
  return clone(RAW_CONTENT_SETTINGS);
}

export function getUiMockBlogPosts() {
  return clone(RAW_BLOG);
}

export function findUiMockBlogPostBySlug(slug) {
  if (!slug) return null;
  const p = RAW_BLOG.find((b) => b.slug === slug);
  return p ? clone(p) : null;
}

export function getUiMockHomeBundle() {
  return {
    products: getUiMockProducts(),
    categories: getUiMockCategories(),
    slider: getUiMockSlider(),
    homeContent: getUiMockHomeContent(),
  };
}

export function getUiMockProductPageData(slugOrId) {
  const product = findUiMockProduct(slugOrId);
  if (!product) return { product: null, reviews: [] };
  const p = clone(product);
  const reviews = getUiMockReviewsForProduct(p.id);
  return { product: p, reviews };
}
