import HomeContent from '@/components/HomeContent';
import { fetchHomePageData } from '@/lib/fetchHomeServer';

export const metadata = {
  title: 'Nature Secret | Skincare & Botanical Body Care | Pakistan',
  description:
    'Premium botanical skincare and body oils for your daily ritual. Featuring Nature Secret PX Oil—crafted for gentle massage and soft, nourished-feeling skin.',
  keywords: 'nature secret px oil, skincare pakistan, botanical body care, self-care, natural cosmetics, body oil',
  openGraph: {
    title: 'Nature Secret | Skincare & Botanical Body Care',
    description: 'Premium botanical skincare and body oils for everyday care, featuring Nature Secret PX Oil.',
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
      description:
        'Pakistan-based brand for botanical skincare and body care—thoughtful formulas inspired by traditional ingredients and modern minimal routines.',
    },
    {
      '@type': 'WebSite',
      name: 'Nature Secret',
      url: 'https://naturesecret.pk',
      description: 'Shop botanical skincare and body oils from Nature Secret, including Nature Secret PX Oil and upcoming skincare essentials.',
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
