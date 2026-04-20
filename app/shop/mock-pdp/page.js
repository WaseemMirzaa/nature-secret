import ProductDetailClient from '../[id]/ProductDetailClient';
import {
  mockPdpProduct,
  mockPdpReviews,
  mockPdpContentSettings,
  MOCK_PDP_SLUG,
} from '@/lib/mockPdpData';

export const metadata = {
  title: 'Mock product PDP (design) | Nature Secret',
  robots: { index: false, follow: false },
};

/**
 * Open: http://localhost:3000/shop/mock-pdp
 * Uses static data — no catalog API required.
 */
export default function MockPdpPage() {
  return (
    <ProductDetailClient
      key={MOCK_PDP_SLUG}
      slugOrId={MOCK_PDP_SLUG}
      initialProduct={mockPdpProduct}
      initialReviews={mockPdpReviews}
      initialContentSettings={mockPdpContentSettings}
    />
  );
}
