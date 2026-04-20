/** Static PDP fixture for local design QA (`/shop/mock-pdp`). */

const logo = '/assets/nature-secret-logo.svg';

export const MOCK_PDP_SLUG = 'mock-pdp';

export const MOCK_PDP_PRODUCT = {
  id: 'pdp-mock-design-v1',
  slug: MOCK_PDP_SLUG,
  name: 'Argan renewal oil — design preview',
  price: 2490,
  compareAtPrice: 3290,
  inventory: 42,
  categoryId: 'cat-mock-oils',
  category: { name: 'Oils', slug: 'oils' },
  rating: 4.7,
  reviewCount: 186,
  shortDescription: 'Lightweight daily oil for dry or dull skin.',
  description: `<p>Silky, fast-absorbing oil made for everyday comfort—no greasy film, just soft skin and a calm glow.</p><p>Layer under moisturizer morning or night; a few drops go a long way on face, neck, and hands.</p><p>Designed for sensitive routines: fragrance-forward but balanced, with a satin finish that plays well under makeup.</p><h3>How to Use</h3><ol><li>Cleanse and pat dry.</li><li>Warm 2–3 drops between palms.</li><li>Press gently into skin; follow with SPF by day.</li></ol><h3>Key Benefits</h3><ul><li>Locks in moisture</li><li>Supports barrier comfort</li><li>Works on body or face</li></ul>`,
  images: [logo, logo, logo, logo],
  faq: [
    { q: 'Is this suitable for sensitive skin?', a: 'Patch test first; the formula is kept minimal, but every skin is different.' },
    { q: 'How long does delivery take?', a: 'Most orders arrive within 3–7 business days depending on your city.' },
  ],
  showDisclaimer: true,
  disclaimerTitle: 'Important note',
  disclaimerItems: ['For external use only.', 'Avoid contact with eyes.'],
  variants: [
    {
      id: 'var-mock-30',
      name: '30 ml',
      price: 2490,
      compareAtPrice: 2890,
      images: [logo, logo],
    },
    {
      id: 'var-mock-50',
      name: '50 ml',
      price: 3190,
      compareAtPrice: 3790,
      images: [logo],
    },
  ],
  productBadges: [],
};

export const MOCK_PDP_REVIEWS = [
  {
    id: 'mock-r1',
    authorName: 'Sana K.',
    rating: 5,
    body: 'Absorbs quickly and my skin feels calmer after a week.',
    collection: 'user',
  },
  {
    id: 'mock-r2',
    authorName: 'Omar',
    rating: 5,
    body: 'Great under sunscreen — no pilling.',
    collection: 'user',
  },
  {
    id: 'mock-r3',
    authorName: 'Live clip',
    rating: 5,
    body: 'Short clip from a happy customer.',
    collection: 'live',
  },
];
