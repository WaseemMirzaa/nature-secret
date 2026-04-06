// Static site copy and config (no dummy data)

export const DEFAULT_CONTACT = {
  emails: 'support@naturesecret.pk',
  phone: '+92 3714165937',
  whatsappNumber: '923714165937',
};

export const SHIPPING_POLICY = 'Free shipping on orders above Rs 999. Standard delivery 5–7 business days. Express available at checkout.';
export const RETURN_POLICY = '7-day return if seal of the box is not opened after delivery.';
export const POLICY_DISCLAIMER = 'Cosmetic body oil for external use only. Patch test before full use.';

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

/** Must match product hero `<Image>` and `app/shop/[id]/page.js` LCP preload so the browser does not fetch two different optimized URLs. */
export const PRODUCT_HERO_IMAGE_SIZES =
  '(max-width: 1023px) 100vw, (max-width: 1279px) min(576px, 50vw), 448px';
/** Next/Image quality for hero (balance size vs clarity on slow networks). */
export const PRODUCT_HERO_IMAGE_QUALITY = 65;
