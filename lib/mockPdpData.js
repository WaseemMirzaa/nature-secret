/**
 * Static product + reviews for `/shop/mock-pdp` (no API). Shape matches PDP client expectations.
 */

export const MOCK_PDP_SLUG = 'mock-pdp';

const IMG = '/assets/nature-secret-logo.svg';

export const mockPdpProduct = {
  id: '00000000-0000-4000-8000-00000000d001',
  slug: MOCK_PDP_SLUG,
  name: 'Nature Secret — demo PDP (mock)',
  categoryId: '00000000-0000-4000-8000-00000000c001',
  price: 249000,
  compareAtPrice: 299000,
  rating: 4.7,
  reviewCount: 128,
  inventory: 24,
  isBestseller: true,
  outOfStock: false,
  images: [IMG, IMG],
  imageAlts: ['Front', 'Detail'],
  description:
    '<p>This is <strong>mock product copy</strong> for layout QA on the redesign branch. Cash on delivery and shipping copy still come from constants.</p><p>Second paragraph so read-more / clamp behavior can be checked.</p><ul><li>Botanical-inspired routine</li><li>Designed for everyday use</li></ul>',
  benefits: ['Comforting texture', 'Subtle scent', 'Made for nightly ritual'],
  faq: [
    { q: 'How do I use this demo product?', a: 'This page uses static data — use the real product URL for accurate guidance.' },
    { q: 'Is this in stock?', a: 'Mock inventory is set to 24 units.' },
  ],
  showDisclaimer: true,
  disclaimerTitle: 'Important',
  disclaimerText: '',
  disclaimerItems: ['External use only.', 'Patch test if you have sensitive skin.'],
  productBadges: [],
  variants: [
    {
      id: '00000000-0000-4000-8000-00000000v001',
      name: '50 ml',
      volume: '50 ml',
      price: 249000,
      compareAtPrice: 299000,
      images: [IMG],
      image: IMG,
    },
    {
      id: '00000000-0000-4000-8000-00000000v002',
      name: '100 ml',
      volume: '100 ml',
      price: 429000,
      compareAtPrice: 499000,
      images: [IMG],
      image: IMG,
    },
  ],
};

export const mockPdpReviews = [
  {
    id: '00000000-0000-4000-8000-00000000r001',
    authorName: 'Ayesha K.',
    rating: 5,
    body: 'Lovely texture — mock review for layout.\n---\nOutcome: Would buy again.',
    collection: 'user',
    media: [],
    approved: true,
  },
  {
    id: '00000000-0000-4000-8000-00000000r002',
    authorName: 'Sara M.',
    rating: 4,
    body: 'Good for evening routine. Mock data only.',
    collection: 'user',
    media: [],
    approved: true,
  },
];

export const mockPdpContentSettings = {
  footerDisclaimer: 'Mock footer disclaimer.',
  productDisclaimerTitle: 'Product notice (mock)',
  productDisclaimerText: 'This PDP uses static mock data for design review.',
  homeHeroIntro: '',
  homeStoryLabel: '',
  homeStoryHeading: '',
  homeStoryHtml: '',
};
