// Dummy data for Nature Secret — replace with D1/API later

export const CATEGORIES = [
  { id: 'herbal-oils', name: 'Herbal Oils', slug: 'herbal-oils' },
  { id: 'skin-care', name: 'Skin Care', slug: 'skin-care' },
];

export const PRODUCTS = [
  {
    id: '10',
    name: 'Painrex Oil',
    slug: 'painrex-oil',
    categoryId: 'herbal-oils',
    badge: 'Bestseller',
    badgeSub: 'Top selling',
    price: 49900,
    compareAtPrice: null,
    description: 'Fast pain relief herbal oil for muscle, bones & joint pain. Nature Secret premium formulation.',
    benefits: ['Muscle pain', 'Joint pain', 'Arthritis & back pain', 'Neck & knee pain', '50 ml'],
    images: [
      '/assets/painrex-oil-main.png',
    ],
    rating: 4.8,
    reviewCount: 0,
    inventory: 1,
    variants: [
      { id: 'v10-50', name: '50 ml', volume: '50ml', price: 49900, image: '/assets/painrex-oil-main.png' },
      { id: 'v10-100', name: '100 ml', volume: '100ml', price: 89900, image: '/assets/painrex-oil-main.png' },
    ],
    faq: [
      { q: 'Where to use?', a: 'Muscle pain, joint pain, arthritis, back pain, neck pain, knee pain.' },
      { q: 'How to apply?', a: 'Apply a few drops to the affected area and massage gently.' },
    ],
  },
  {
    id: '1',
    name: 'Lavender Calm Essential Oil',
    slug: 'lavender-calm-essential-oil',
    categoryId: 'herbal-oils',
    price: 2499,
    compareAtPrice: 2999,
    description: 'Pure lavender essential oil for relaxation and skin. Cold-pressed, organic.',
    benefits: ['Calming', 'Skin-soothing', 'Organic', 'Cold-pressed'],
    images: [
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800',
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800',
    ],
    rating: 4.9,
    reviewCount: 128,
    inventory: 50,
    variants: [
      { id: 'v1-10', name: '10ml', volume: '10ml', price: 2499, image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400' },
      { id: 'v1-30', name: '30ml', volume: '30ml', price: 5999, image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400' },
    ],
    faq: [
      { q: 'How to use?', a: 'Add 2–3 drops to carrier oil or diffuser.' },
      { q: 'Shelf life?', a: '24 months unopened, 12 months after opening.' },
    ],
  },
  {
    id: '2',
    name: 'Tea Tree Clarifying Oil',
    slug: 'tea-tree-clarifying-oil',
    categoryId: 'herbal-oils',
    price: 1999,
    compareAtPrice: null,
    description: 'Antimicrobial tea tree oil for clear, balanced skin.',
    benefits: ['Clarifying', 'Antimicrobial', 'Natural', 'Australian sourced'],
    images: [
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800',
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800',
    ],
    rating: 4.8,
    reviewCount: 94,
    inventory: 80,
    variants: [
      { id: 'v2-10', name: '10ml', volume: '10ml', price: 1999, image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400' },
      { id: 'v2-50', name: '50ml', volume: '50ml', price: 4499, image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400' },
    ],
    faq: [
      { q: 'Safe for face?', a: 'Yes, dilute 1–2% in carrier oil.' },
      { q: 'Origin?', a: 'Sourced from Australian tea tree plantations.' },
    ],
  },
  {
    id: '3',
    name: 'Rosehip Nourishing Serum',
    slug: 'rosehip-nourishing-serum',
    categoryId: 'skin-care',
    price: 3499,
    compareAtPrice: 3999,
    description: 'Lightweight serum with rosehip oil. Reduces fine lines and evens tone.',
    benefits: ['Anti-aging', 'Brightening', 'Vegan', 'No parabens'],
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800',
    ],
    rating: 4.9,
    reviewCount: 203,
    inventory: 45,
    variants: [
      { id: 'v3-30', name: '30ml', volume: '30ml', price: 3499, image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400' },
      { id: 'v3-50', name: '50ml', volume: '50ml', price: 4999, image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400' },
    ],
    faq: [
      { q: 'When to apply?', a: 'Morning and evening after cleansing.' },
      { q: 'For which skin?', a: 'All skin types, especially dry and mature.' },
    ],
  },
  {
    id: '4',
    name: 'Chamomile Soothing Face Cream',
    slug: 'chamomile-soothing-face-cream',
    categoryId: 'skin-care',
    price: 4299,
    compareAtPrice: null,
    description: 'Gentle cream with chamomile extract. Soothes sensitive and stressed skin.',
    benefits: ['Soothing', 'Sensitive skin', 'Dermatologist tested', 'Fragrance-free option'],
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800',
    ],
    rating: 4.7,
    reviewCount: 67,
    inventory: 60,
    variants: [
      { id: 'v4-50', name: '50ml', volume: '50ml', price: 4299, image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400' },
    ],
    faq: [
      { q: 'Vegan?', a: 'Yes, 100% vegan and cruelty-free.' },
      { q: 'SPF?', a: 'No SPF. Use sunscreen separately.' },
    ],
  },
  {
    id: '5',
    name: 'Eucalyptus Refresh Blend',
    slug: 'eucalyptus-refresh-blend',
    categoryId: 'herbal-oils',
    price: 2799,
    compareAtPrice: 3299,
    description: 'Invigorating eucalyptus blend for breath and focus.',
    benefits: ['Refreshing', 'Respiratory support', 'Blend', 'Natural'],
    images: [
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800',
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800',
    ],
    rating: 4.8,
    reviewCount: 56,
    inventory: 40,
    variants: [
      { id: 'v5-15', name: '15ml', volume: '15ml', price: 2799, image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400' },
    ],
    faq: [
      { q: 'Can I ingest?', a: 'This blend is for topical and aromatic use only.' },
    ],
  },
  {
    id: '6',
    name: 'Vitamin C Brightening Cream',
    slug: 'vitamin-c-brightening-cream',
    categoryId: 'skin-care',
    price: 3999,
    compareAtPrice: 4699,
    description: 'Stable vitamin C cream for radiance and dark spot correction.',
    benefits: ['Brightening', 'Antioxidant', 'Stable formula', 'Dermatologist approved'],
    images: [
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
    ],
    rating: 4.9,
    reviewCount: 142,
    inventory: 35,
    variants: [
      { id: 'v6-30', name: '30ml', volume: '30ml', price: 3999, image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400' },
    ],
    faq: [
      { q: 'With retinol?', a: 'Can be used in same routine; apply vitamin C first.' },
    ],
  },
  {
    id: '7',
    name: 'Hyaluronic Acid Hydrating Serum',
    slug: 'hyaluronic-acid-hydrating-serum',
    categoryId: 'skin-care',
    price: 3299,
    compareAtPrice: null,
    description: 'Deep hydration serum with hyaluronic acid. Plumps and smooths fine lines.',
    benefits: ['Hydrating', 'Lightweight', 'Vegan', 'Fragrance-free'],
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800',
    ],
    rating: 4.8,
    reviewCount: 89,
    inventory: 0,
    variants: [
      { id: 'v7-30', name: '30ml', volume: '30ml', price: 3299, image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400' },
    ],
    faq: [
      { q: 'When to use?', a: 'After cleansing, before moisturiser.' },
      { q: 'For which skin?', a: 'All skin types, especially dry and dehydrated.' },
    ],
  },
  {
    id: '8',
    name: 'Niacinamide Clarifying Serum',
    slug: 'niacinamide-clarifying-serum',
    categoryId: 'skin-care',
    price: 2999,
    compareAtPrice: 3499,
    description: '10% niacinamide serum to refine pores and even skin tone.',
    benefits: ['Pore-refining', 'Oil control', 'Brightening', 'Dermatologist tested'],
    images: [
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
    ],
    rating: 4.7,
    reviewCount: 112,
    inventory: 0,
    variants: [
      { id: 'v8-30', name: '30ml', volume: '30ml', price: 2999, image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400' },
    ],
    faq: [
      { q: 'With vitamin C?', a: 'Yes, use niacinamide in AM and vitamin C in PM or alternate.' },
    ],
  },
  {
    id: '9',
    name: 'Retinol Renewal Serum',
    slug: 'retinol-renewal-serum',
    categoryId: 'skin-care',
    price: 4499,
    compareAtPrice: null,
    description: 'Gentle retinol serum for cell renewal and smoother texture.',
    benefits: ['Anti-aging', 'Texture refinement', 'Encapsulated retinol', 'Suitable for beginners'],
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800',
    ],
    rating: 4.9,
    reviewCount: 76,
    inventory: 0,
    variants: [
      { id: 'v9-30', name: '30ml', volume: '30ml', price: 4499, image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400' },
    ],
    faq: [
      { q: 'How often?', a: 'Start 1–2 times per week, build up as tolerated.' },
      { q: 'SPF?', a: 'Always use SPF during the day when using retinol.' },
    ],
  },
];

export const COLLECTIONS = [
  { id: 'bestellers', name: 'Bestsellers', slug: 'bestsellers', productIds: ['10', '1', '3', '4'] },
  { id: 'new-arrivals', name: 'New Arrivals', slug: 'new-arrivals', productIds: ['10', '5', '6'] },
  { id: 'skin-care', name: 'Skin Care', slug: 'skin-care', productIds: ['3', '4', '6'] },
  { id: 'herbal-oils', name: 'Herbal Oils', slug: 'herbal-oils', productIds: ['10', '1', '2', '5'] },
];

export const TESTIMONIALS = [
  { id: '1', name: 'Fatima K., Lahore', text: 'Painrex Oil really works for my back pain. Ab main roz use karti hoon, quality bilkul theek hai. Delivery bhi jaldi mili.', rating: 5 },
  { id: '2', name: 'Ahmed R., Karachi', text: 'Best herbal oil I have used. My joint pain is much better. Would recommend to anyone in Pakistan looking for natural pain relief.', rating: 5 },
  { id: '3', name: 'Ayesha M., Islamabad', text: 'Skin care range is very good. Oil bhi try kiya—genuine product, packaging achhi thi. Will order again.', rating: 5 },
];

export const TRUST_BADGES = [
  { id: '1', text: 'Free shipping over Rs 999' },
  { id: '2', text: '30-day returns' },
  { id: '3', text: 'Secure payment' },
  { id: '4', text: 'Authentic & organic' },
];

export const PRESS = [
  { id: '1', name: 'Vogue India', quote: 'Nature Secret is redefining clean beauty.' },
  { id: '2', name: 'Elle', quote: 'A minimalist approach to luxury skincare.' },
];

// Blog template types — admin can choose when creating/editing posts
export const BLOG_TEMPLATES = [
  { id: 'standard', name: 'Standard Article', slug: 'standard' },
  { id: 'listicle', name: 'Listicle', slug: 'listicle' },
  { id: 'story', name: 'Story / Editorial', slug: 'story' },
  { id: 'how-to', name: 'How-to Guide', slug: 'how-to' },
  { id: 'tips', name: 'Tips & Tricks', slug: 'tips' },
  { id: 'ingredient-spotlight', name: 'Ingredient Spotlight', slug: 'ingredient-spotlight' },
  { id: 'routine', name: 'Routine / Regimen', slug: 'routine' },
  { id: 'qa', name: 'Q&A', slug: 'qa' },
  { id: 'news', name: 'News / Update', slug: 'news' },
  { id: 'review', name: 'Product Review', slug: 'review' },
];

export const BLOG_CATEGORIES = [
  { id: 'skincare-tips', name: 'Skincare Tips', slug: 'skincare-tips' },
  { id: 'ingredients', name: 'Ingredients', slug: 'ingredients' },
  { id: 'wellness', name: 'Wellness', slug: 'wellness' },
];

export const BLOG_POSTS = [
  {
    id: '1',
    title: 'Why Lavender Oil Belongs in Your Skincare Routine',
    slug: 'why-lavender-oil-skincare',
    excerpt: 'Discover the calming and skin-loving benefits of pure lavender essential oil.',
    body: '<p>Lavender isn’t just for relaxation—it’s a powerhouse for skin. From calming irritation to supporting repair, here’s how to use it.</p><p>Our cold-pressed lavender oil is sourced from organic farms and bottled without additives.</p>',
    template: 'standard',
    categoryId: 'ingredients',
    author: { name: 'Nature Secret Team', role: 'Editor' },
    image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=1200',
    readTimeMinutes: 4,
    publishedAt: '2024-02-15T10:00:00Z',
    relatedProductIds: ['1'],
    seoTitle: 'Lavender Oil for Skincare | Nature Secret',
    seoDescription: 'Learn how lavender essential oil can transform your skincare routine. Organic, pure, effective.',
  },
  {
    id: '2',
    title: '5 Essential Oils Every Beginner Should Try',
    slug: '5-essential-oils-beginners',
    excerpt: 'A simple guide to the first five oils to add to your collection.',
    body: '<p>Starting with essential oils? These five are versatile, safe, and perfect for beginners.</p><ol><li>Lavender – calm and skin</li><li>Tea tree – clarifying</li><li>Eucalyptus – refresh</li><li>Peppermint – energy</li><li>Chamomile – soothe</li></ol></p>',
    template: 'listicle',
    categoryId: 'wellness',
    author: { name: 'Dr. A. Sharma', role: 'Wellness Advisor' },
    image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1200',
    readTimeMinutes: 6,
    publishedAt: '2024-02-10T10:00:00Z',
    relatedProductIds: ['1', '2', '5'],
    seoTitle: '5 Essential Oils for Beginners | Nature Secret',
    seoDescription: 'Beginner-friendly guide to essential oils. Lavender, tea tree, eucalyptus and more.',
  },
  {
    id: '3',
    title: 'The Story Behind Our Rosehip Serum',
    slug: 'story-rosehip-serum',
    excerpt: 'From Chilean farms to your bathroom shelf—how we source and formulate.',
    body: '<p>Our rosehip oil comes from small farms in Chile, where berries are cold-pressed within hours of harvest.</p><p>We then blend with vitamin E and a lightweight base so it absorbs quickly without greasiness.</p>',
    template: 'story',
    categoryId: 'skincare-tips',
    author: { name: 'Nature Secret Team', role: 'Editor' },
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200',
    readTimeMinutes: 5,
    publishedAt: '2024-02-01T10:00:00Z',
    relatedProductIds: ['3'],
    seoTitle: 'Rosehip Serum Story | Nature Secret',
    seoDescription: 'How we source and create our best-selling rosehip nourishing serum.',
  },
];

// Admin users (dummy — in production use hashed passwords and 2FA secret in DB)
// Password for both: Admin123! / Staff123!
export const ADMIN_USERS = [
  { id: 'admin-1', email: 'admin@naturesecret.com', role: 'admin', passwordHash: 'dummy-hash-admin', twoFactorSecret: null, twoFactorEnabled: false },
  { id: 'staff-1', email: 'staff@naturesecret.com', role: 'staff', passwordHash: 'dummy-hash-staff', twoFactorSecret: null, twoFactorEnabled: false },
];

// Initial orders for dashboard (stored in local cache; append on checkout)
export const INITIAL_ORDERS = [
  { id: 'ORD-001', customerName: 'Priya S.', email: 'priya@example.com', total: 5998, status: 'delivered', createdAt: '2024-02-20T10:00:00Z', items: [{ productId: '1', variantId: 'v1-10', qty: 2, price: 2499 }] },
  { id: 'ORD-002', customerName: 'Rahul M.', email: 'rahul@example.com', total: 3499, status: 'shipped', createdAt: '2024-02-22T14:00:00Z', items: [{ productId: '3', variantId: 'v3-30', qty: 1, price: 3499 }] },
  { id: 'ORD-003', customerName: 'Anita K.', email: 'anita@example.com', total: 8498, status: 'processing', createdAt: '2024-02-24T09:00:00Z', items: [{ productId: '4', variantId: 'v4-50', qty: 1, price: 4299 }, { productId: '1', variantId: 'v1-30', qty: 1, price: 5999 }] },
  { id: 'ORD-004', customerName: 'Vikram P.', email: 'vikram@example.com', total: 1999, status: 'pending', createdAt: '2024-02-25T11:00:00Z', items: [{ productId: '2', variantId: 'v2-10', qty: 1, price: 1999 }] },
];

export const SHIPPING_POLICY = 'Free shipping on orders above Rs 999. Standard delivery 5–7 business days. Express available at checkout.';
export const RETURN_POLICY = '30-day hassle-free returns. Product must be unopened or gently used. Contact support for a return label.';

// Dummy analytics events with logged-in visitors (customerEmail + customerName) for admin analytics demo
export const INITIAL_ANALYTICS_EVENTS = [
  { type: 'pageView', path: '/', timestamp: '2024-02-20T10:00:00Z', sessionId: 'sess_dummy_1', customerEmail: 'fatima.k@example.com', customerName: 'Fatima K.' },
  { type: 'pageView', path: '/shop', timestamp: '2024-02-20T10:02:00Z', sessionId: 'sess_dummy_1', customerEmail: 'fatima.k@example.com', customerName: 'Fatima K.' },
  { type: 'productView', productId: '10', timestamp: '2024-02-20T10:05:00Z', sessionId: 'sess_dummy_1', customerEmail: 'fatima.k@example.com', customerName: 'Fatima K.' },
  { type: 'addToCart', productId: '10', timestamp: '2024-02-20T10:08:00Z', sessionId: 'sess_dummy_1', customerEmail: 'fatima.k@example.com', customerName: 'Fatima K.' },
  { type: 'purchase', orderId: 'ORD-001', timestamp: '2024-02-20T10:15:00Z', sessionId: 'sess_dummy_1', customerEmail: 'fatima.k@example.com', customerName: 'Fatima K.' },
  { type: 'pageView', path: '/', timestamp: '2024-02-21T09:00:00Z', sessionId: 'sess_dummy_2', customerEmail: 'ahmed.r@example.com', customerName: 'Ahmed R.' },
  { type: 'pageView', path: '/shop', timestamp: '2024-02-21T09:05:00Z', sessionId: 'sess_dummy_2', customerEmail: 'ahmed.r@example.com', customerName: 'Ahmed R.' },
  { type: 'productView', productId: '10', timestamp: '2024-02-21T09:10:00Z', sessionId: 'sess_dummy_2', customerEmail: 'ahmed.r@example.com', customerName: 'Ahmed R.' },
  { type: 'productView', productId: '1', timestamp: '2024-02-21T09:12:00Z', sessionId: 'sess_dummy_2', customerEmail: 'ahmed.r@example.com', customerName: 'Ahmed R.' },
  { type: 'pageView', path: '/', timestamp: '2024-02-22T14:00:00Z', sessionId: 'sess_dummy_3', customerEmail: 'ayesha.m@example.com', customerName: 'Ayesha M.' },
  { type: 'pageView', path: '/blog', timestamp: '2024-02-22T14:02:00Z', sessionId: 'sess_dummy_3', customerEmail: 'ayesha.m@example.com', customerName: 'Ayesha M.' },
  { type: 'productView', productId: '3', timestamp: '2024-02-22T14:10:00Z', sessionId: 'sess_dummy_3', customerEmail: 'ayesha.m@example.com', customerName: 'Ayesha M.' },
  { type: 'addToCart', productId: '3', timestamp: '2024-02-22T14:12:00Z', sessionId: 'sess_dummy_3', customerEmail: 'ayesha.m@example.com', customerName: 'Ayesha M.' },
  { type: 'purchase', orderId: 'ORD-002', timestamp: '2024-02-22T14:20:00Z', sessionId: 'sess_dummy_3', customerEmail: 'ayesha.m@example.com', customerName: 'Ayesha M.' },
  { type: 'pageView', path: '/shop', timestamp: '2024-02-23T11:00:00Z', sessionId: 'sess_dummy_4', customerEmail: 'zainab.h@example.com', customerName: 'Zainab H.' },
  { type: 'productView', productId: '10', timestamp: '2024-02-23T11:05:00Z', sessionId: 'sess_dummy_4', customerEmail: 'zainab.h@example.com', customerName: 'Zainab H.' },
  { type: 'pageView', path: '/', timestamp: '2024-02-24T08:30:00Z', sessionId: 'sess_dummy_5', customerEmail: 'hassan.i@example.com', customerName: 'Hassan I.' },
  { type: 'productView', productId: '4', timestamp: '2024-02-24T08:35:00Z', sessionId: 'sess_dummy_5', customerEmail: 'hassan.i@example.com', customerName: 'Hassan I.' },
];
