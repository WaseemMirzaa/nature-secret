import ProductDetailClient from './ProductDetailClient';
import ProductHeroServer from './ProductHeroServer';
import {
  getCachedProductPageData,
  fetchContentSettingsServer,
  resolveAbsoluteImageUrl,
  getDefaultHeroImageSrcForProduct,
} from '@/lib/fetchProductServer';
import { buildPdpEarlyViewContentInlineScript } from '@/lib/metaEarlyVc';
import { PdpHeroLcpPreload } from '@/lib/pdpHeroImagePreload';

/**
 * ISR: re-render in the background every 5 minutes.
 * This allows experimental.optimizeCss (Critters) to inline critical CSS
 * and defer the full stylesheet — eliminating the render-blocking CSS request.
 * Pure SSR (no revalidate) bypasses Critters entirely.
 */
export const revalidate = 300;

function slugFromParams(params) {
  const raw = params?.id;
  return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
}

export async function generateMetadata({ params }) {
  const slugOrId = slugFromParams(params);
  if (!slugOrId) return { title: 'Product | Nature Secret' };
  const { product } = await getCachedProductPageData(slugOrId);
  if (!product?.name) return { title: 'Product | Nature Secret' };
  const title = `${product.name} | Nature Secret`;
  const plain =
    (typeof product.shortDescription === 'string' && product.shortDescription) ||
    (typeof product.description === 'string' && product.description.replace(/<[^>]+>/g, '').trim()) ||
    title;
  const description = plain.slice(0, 160);
  const og = resolveAbsoluteImageUrl(product.images?.[0] || '');
  return {
    title,
    description,
    openGraph: og ? { title, description, images: [{ url: og }] } : { title, description },
  };
}

export default async function ProductPage({ params }) {
  const slugOrId = slugFromParams(params);
  const [{ product, reviews }, contentSettings] = await Promise.all([
    getCachedProductPageData(slugOrId),
    fetchContentSettingsServer(),
  ]);

  const productImageUrl = product ? getDefaultHeroImageSrcForProduct(product) : '';
  const lcpPreload = productImageUrl ? <PdpHeroLcpPreload src={productImageUrl} /> : null;
  const earlyViewContentScript = product ? buildPdpEarlyViewContentInlineScript(product) : null;

  return (
    <>
      {lcpPreload}
      {earlyViewContentScript ? (
        <script dangerouslySetInnerHTML={{ __html: earlyViewContentScript }} />
      ) : null}
      <ProductDetailClient
        key={slugOrId}
        slugOrId={slugOrId}
        initialProduct={product}
        initialReviews={reviews}
        initialContentSettings={contentSettings}
      >
        {product && productImageUrl && !productImageUrl.includes('/assets/nature-secret-logo') ? (
          <ProductHeroServer src={productImageUrl} alt={product.name || 'Product'} />
        ) : null}
      </ProductDetailClient>
    </>
  );
}
