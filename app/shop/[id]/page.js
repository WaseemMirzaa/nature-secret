import { getImageProps } from 'next/image';
import ProductDetailClient from './ProductDetailClient';
import {
  fetchProductPageData,
  fetchProductBySlugOrId,
  resolveAbsoluteImageUrl,
  getDefaultHeroImageSrcForProduct,
} from '@/lib/fetchProductServer';
import { PRODUCT_HERO_IMAGE_QUALITY, PRODUCT_HERO_IMAGE_SIZES } from '@/lib/constants';

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

  const lcpSrc = product ? getDefaultHeroImageSrcForProduct(product) : '';
  let lcpPreload = null;
  if (lcpSrc && !lcpSrc.includes('/assets/nature-secret-logo')) {
    try {
      const { props: lcpImg } = getImageProps({
        src: lcpSrc,
        alt: '',
        fill: true,
        sizes: PRODUCT_HERO_IMAGE_SIZES,
        priority: true,
        quality: PRODUCT_HERO_IMAGE_QUALITY,
      });
      lcpPreload = (
        <link
          rel="preload"
          as="image"
          href={lcpImg.src}
          {...(lcpImg.srcSet
            ? { imagesrcset: lcpImg.srcSet, imagesizes: lcpImg.sizes || PRODUCT_HERO_IMAGE_SIZES }
            : {})}
          fetchPriority="high"
        />
      );
    } catch {
      lcpPreload = null;
    }
  }

  return (
    <>
      {lcpPreload}
      <ProductDetailClient
        key={slugOrId}
        slugOrId={slugOrId}
        initialProduct={product}
        initialReviews={reviews}
      />
    </>
  );
}
