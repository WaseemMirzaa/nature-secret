import ProductDetailClient from './ProductDetailClient';
import { fetchProductPageData, fetchProductBySlugOrId, resolveAbsoluteImageUrl } from '@/lib/fetchProductServer';

function slugFromParams(params) {
  const raw = params?.id;
  return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
}

export async function generateMetadata({ params }) {
  const slugOrId = slugFromParams(params);
  if (!slugOrId) return { title: 'Product | Nature Secret' };
  const product = await fetchProductBySlugOrId(slugOrId);
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
  const { product, reviews } = await fetchProductPageData(slugOrId);

  return (
    <>
      <ProductDetailClient
        key={slugOrId}
        slugOrId={slugOrId}
        initialProduct={product}
        initialReviews={reviews}
      />
    </>
  );
}
