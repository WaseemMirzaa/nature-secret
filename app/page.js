import HomeContent from '@/components/HomeContent';
import { fetchHomePageData } from '@/lib/fetchHomeServer';

export const metadata = {
  title: 'Nature Secret | Premium Herbal Oils & Skincare | Pakistan',
  description: 'Premium herbal solutions for daily comfort and skin wellness. Featuring Nature Secret PX Oil with trusted care for soothing massage and enhanced body mobility.',
  keywords: 'nature secret px oil, herbal oil, pakistan, skincare, wellness, self-care, botanical massage oil',
  openGraph: {
    title: 'Nature Secret | Premium Herbal Oils & Skincare',
    description: 'Premium herbal solutions for daily comfort and skin wellness, featuring Nature Secret PX Oil.',
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
      description: 'Natural care brand inspired by traditional herbal wisdom, focused on daily comfort, self-care, and skin wellness in Pakistan.',
    },
    {
      '@type': 'WebSite',
      name: 'Nature Secret',
      url: 'https://naturesecret.pk',
      description: 'Shop premium herbal oils and skincare from Nature Secret, including Nature Secret PX Oil and upcoming skincare essentials.',
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
