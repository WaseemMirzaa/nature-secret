import { getImageProps } from 'next/image';
import { PRODUCT_HERO_IMAGE_QUALITY, PRODUCT_HERO_IMAGE_SIZES } from '@/lib/constants';

/**
 * Preload href must match what `next/image` requests (`/_next/image?...`), not the raw API URL,
 * or the browser treats LCP as a separate fetch (large resource load delay).
 */
export function PdpHeroLcpPreload({ src }) {
  if (!src || typeof src !== 'string' || src.includes('/assets/nature-secret-logo')) return null;
  try {
    const { props } = getImageProps({
      src,
      alt: '',
      width: 1200,
      height: 1200,
      sizes: PRODUCT_HERO_IMAGE_SIZES,
      quality: PRODUCT_HERO_IMAGE_QUALITY,
    });
    return (
      <link
        rel="preload"
        as="image"
        href={props.src}
        {...(props.srcSet ? { imageSrcSet: props.srcSet } : {})}
        {...(props.sizes ? { imageSizes: props.sizes } : {})}
        fetchPriority="high"
      />
    );
  } catch {
    return <link rel="preload" as="image" href={src} fetchPriority="high" />;
  }
}
