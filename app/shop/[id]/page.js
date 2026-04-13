import ProductDetailClient from './ProductDetailClient';
import ProductHeroServer from './ProductHeroServer';
import {
  getCachedProductPageData,
  fetchContentSettingsServer,
  resolveAbsoluteImageUrl,
  getDefaultHeroImageSrcForProduct,
} from '@/lib/fetchProductServer';

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
  const lcpPreload =
    productImageUrl && !productImageUrl.includes('/assets/nature-secret-logo') ? (
      <link rel="preload" as="image" href={productImageUrl} fetchPriority="high" />
    ) : null;

  return (
    <>
      {lcpPreload}
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
