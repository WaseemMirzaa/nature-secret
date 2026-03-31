import HomeContent from '@/components/HomeContent';
import { fetchHomePageData } from '@/lib/fetchHomeServer';

export const metadata = {
  title: 'Nature Secret | Premium Herbal Oils & Skincare | Pakistan',
  description: 'Painrex Oil and premium herbal care products trusted in Pakistan. Clean ingredients, refined quality, and skincare coming soon.',
  keywords: 'herbal oil, painrex oil, Pakistan, skincare, herbal oils, wellness, self-care',
  openGraph: {
    title: 'Nature Secret | Premium Herbal Oils & Skincare',
    description: 'Painrex Oil and premium herbal care products trusted in Pakistan. Clean, minimal, refined.',
    type: 'website',
  },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'Nature Secret',
      url: 'https://naturesecret.pk',
      description: 'Premium herbal oils and skincare products. Painrex Oil and natural wellness essentials trusted in Pakistan.',
    },
    {
      '@type': 'WebSite',
      name: 'Nature Secret',
      url: 'https://naturesecret.pk',
      description: 'Shop premium herbal oils and skincare. Painrex Oil, natural and trusted in Pakistan.',
      potentialAction: { '@type': 'SearchAction', target: 'https://naturesecret.pk/shop?q={search_term_string}', 'query-input': 'required name=search_term_string' },
    },
  ],
};

export default async function HomePage() {
  const { products, categories, slider, highlightReviews } = await fetchHomePageData();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <HomeContent
        initialProducts={products}
        initialCategories={categories}
        initialSlider={slider}
        initialHighlightReviews={highlightReviews}
      />
    </>
  );
}
