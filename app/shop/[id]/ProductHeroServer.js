import Image from 'next/image';
import { PRODUCT_HERO_IMAGE_QUALITY, PRODUCT_HERO_IMAGE_SIZES } from '@/lib/constants';

/**
 * Server-rendered PDP hero so LCP image is in the HTML stream before client JS (cuts resource load delay).
 * Client parent swaps to a client `<Image>` when the user picks another gallery thumb.
 */
export default function ProductHeroServer({ src, alt }) {
  if (!src || typeof src !== 'string') return null;
  return (
    <Image
      src={src}
      alt={alt || ''}
      fill
      className="object-contain transition-transform duration-300"
      sizes={PRODUCT_HERO_IMAGE_SIZES}
      priority={true}
      loading="eager"
      fetchPriority="high"
      decoding="async"
      quality={PRODUCT_HERO_IMAGE_QUALITY}
    />
  );
}
