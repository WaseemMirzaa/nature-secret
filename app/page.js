import HomeContent from '@/components/HomeContent';

export const metadata = {
  title: 'Nature Secret | Premium Herbal Oils for Pain Care & Skincare | Pakistan',
  description: 'Painrex Oil: natural relief for muscle, joint and back pain. Premium herbal oils trusted in Pakistan. Skincare serums and care coming soon. Clean ingredients, minimal luxury.',
  keywords: 'herbal oil, pain relief oil, Painrex, natural pain relief, Pakistan, skincare, herbal oils, joint pain, muscle pain',
  openGraph: {
    title: 'Nature Secret | Premium Herbal Oils & Skincare',
    description: 'Painrex Oil for pain care. Herbal oils and skincare trusted in Pakistan. Clean, minimal, effective.',
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
      description: 'Premium herbal oils for pain care and skincare. Painrex Oil and natural wellness products trusted in Pakistan.',
    },
    {
      '@type': 'WebSite',
      name: 'Nature Secret',
      url: 'https://naturesecret.pk',
      description: 'Shop premium herbal oils for pain relief and skincare. Painrex Oil, natural and trusted in Pakistan.',
      potentialAction: { '@type': 'SearchAction', target: 'https://naturesecret.pk/shop?q={search_term_string}', 'query-input': 'required name=search_term_string' },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <HomeContent />
    </>
  );
}
