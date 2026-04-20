import ProductDetailClient from '../[id]/ProductDetailClient';
import { MOCK_PDP_PRODUCT, MOCK_PDP_REVIEWS, MOCK_PDP_SLUG } from '@/lib/mockPdpDesignV1';

export const metadata = {
  title: 'Mock PDP (design v1) | Nature Secret',
  robots: { index: false, follow: false },
};

export default function MockPdpPage() {
  return (
    <ProductDetailClient
      key={MOCK_PDP_SLUG}
      slugOrId={MOCK_PDP_SLUG}
      initialProduct={MOCK_PDP_PRODUCT}
      initialReviews={MOCK_PDP_REVIEWS}
      initialContentSettings={null}
    />
  );
}
