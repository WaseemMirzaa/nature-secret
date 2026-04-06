// Static site copy and config (no dummy data)

export const DEFAULT_CONTACT = {
  emails: 'support@naturesecret.pk',
  phone: '+92 3714165937',
  whatsappNumber: '923714165937',
};

export const SHIPPING_POLICY = 'Free shipping on orders above Rs 999. Standard delivery 5–7 business days. Express available at checkout.';
export const RETURN_POLICY = '7-day return if seal of the box is not opened after delivery.';
export const POLICY_DISCLAIMER = 'Cosmetic body oil for external use only. Patch test before full use.';

export const TRUST_BADGES = [
  { id: '1', text: 'Free shipping over Rs 999' },
  { id: '2', text: '7-day return policy' },
  { id: '3', text: 'Secure payment' },
  { id: '4', text: 'Authentic & organic' },
];

/** Scrolling strip (shields.io) — keep list short to limit parallel requests on slow networks (Speed Index). */
export const TRUST_BADGE_TICKER = [
  { id: 'iso9001', alt: 'ISO 9001 quality management', src: 'https://img.shields.io/badge/ISO%209001-Quality%20systems-1e3a5f?style=for-the-badge' },
  { id: 'gmp', alt: 'Good Manufacturing Practice', src: 'https://img.shields.io/badge/GMP-Certified%20production-2e7d32?style=for-the-badge' },
  { id: 'halal', alt: 'Halal', src: 'https://img.shields.io/badge/Halal-Compliant-0d9488?style=for-the-badge' },
  { id: 'cruelty', alt: 'Cruelty free', src: 'https://img.shields.io/badge/Cruelty%20free-Not%20tested%20on%20animals-7c3aed?style=for-the-badge' },
  { id: 'secure', alt: 'Secure checkout', src: 'https://img.shields.io/badge/Secure-SSL%20checkout-1e40af?style=for-the-badge' },
  { id: 'natural', alt: 'Natural ingredients', src: 'https://img.shields.io/badge/Natural-Botanical%20ingredients-166534?style=for-the-badge' },
  { id: 'shipping', alt: 'Free shipping', src: 'https://img.shields.io/badge/Free%20shipping-On%20orders%20Rs%20999%2B-d97706?style=for-the-badge' },
  { id: 'returns', alt: 'Easy returns', src: 'https://img.shields.io/badge/7--day-Return%20policy-57534e?style=for-the-badge' },
];

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
  { id: 'wellness', name: 'Self-care', slug: 'wellness' },
];
