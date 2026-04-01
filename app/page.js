import HomeContent from '@/components/HomeContent';
import { fetchHomePageData } from '@/lib/fetchHomeServer';

export const metadata = {
  title: 'Nature Secret | Skincare & Botanical Body Care | Pakistan',
  description:
    'Nature Secret botanical skincare and body care. Nature Secret PX Oil is a relaxing massage oil for comforting neck, muscles, and joints.',
  keywords:
    'nature secret px oil, massage oil pakistan, neck muscles joints, botanical body care, relaxing body oil, skincare pakistan',
  openGraph: {
    title: 'Nature Secret | Skincare & Botanical Body Care',
    description:
      'Nature Secret PX Oil—relaxing massage oil for neck, muscles, and joints. Botanical skincare and body care from Pakistan.',
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
        'Pakistan-based brand for botanical skincare and body care—including Nature Secret PX Oil, a relaxing massage oil for neck, muscles, and joints.',
    },
    {
      '@type': 'WebSite',
      name: 'Nature Secret',
      url: 'https://naturesecret.pk',
      description:
        'Shop Nature Secret—including PX Oil, a relaxing massage oil for neck, muscles, and joints—and botanical skincare.',
      potentialAction: { '@type': 'SearchAction', target: 'https://naturesecret.pk/shop?q={search_term_string}', 'query-input': 'required name=search_term_string' },
    },
  ],
};

export default async function HomePage() {
  const { products, categories, slider, homeContent } = await fetchHomePageData();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <HomeContent
        initialProducts={products}
        initialCategories={categories}
        initialSlider={slider}
        initialHomeContent={homeContent}
      />
    </>
  );
}
