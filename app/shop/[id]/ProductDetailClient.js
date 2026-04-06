'use client';

import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import Link from '@/components/Link';
import Image from 'next/image';
import { useProductsStore, useCartStore, useCartOpenStore, useWishlistStore, useCurrencyStore } from '@/lib/store';
import { useBreadcrumbLabel } from '@/lib/BreadcrumbContext';
import { PRODUCT_HERO_IMAGE_QUALITY, PRODUCT_HERO_IMAGE_SIZES, SHIPPING_POLICY, RETURN_POLICY } from '@/lib/constants';
import {
  trackViewContent,
  trackLandingPageViewForProduct,
  trackAddToCart,
  trackAddToWishlist,
  trackOutOfStockView,
} from '@/lib/analytics';
import { formatPrice } from '@/lib/currency';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import {
  getProductById,
  getProductBySlug,
  resolveImageUrl,
  getReviews,
  submitReview,
  uploadReviewMedia,
  productPath,
  getContentSettings,
} from '@/lib/api';
import { compressReviewMediaFile } from '@/lib/compressReviewMedia';
import { InlineLoader } from '@/components/ui/PageLoader';

const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

function getVideoPresentation(url) {
  if (!url || typeof url !== 'string') return null;
  const u = url.trim();
  try {
    const parsed = new URL(u);
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace(/^\//, '').split('/')[0];
      if (id) return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${id}` };
    }
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v');
      if (id) return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${id}` };
      const short = parsed.pathname.match(/\/embed\/([^/?]+)/);
      if (short) return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${short[1]}` };
    }
    if (parsed.hostname.includes('vimeo.com')) {
      const m = parsed.pathname.match(/\/(\d+)/);
      if (m) return { kind: 'embed', src: `https://player.vimeo.com/video/${m[1]}` };
    }
  } catch {
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(u)) return { kind: 'native', src: u };
    return null;
  }
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(u)) return { kind: 'native', src: u };
  return { kind: 'native', src: u };
}

function ReviewMediaBlock({ item, resolveImageUrl }) {
  const rawUrl = item?.url;
  if (!rawUrl) return null;
  const isVideo = item.type === 'video';
  if (!isVideo) {
    const imgSrc = resolveImageUrl(rawUrl) || rawUrl;
    return (
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-neutral-100">
        <Image src={imgSrc} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
      </div>
    );
  }
  const pres = getVideoPresentation(rawUrl);
  if (!pres) return null;
  if (pres.kind === 'embed') {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          title="Review video"
          src={pres.src}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <video src={pres.src} controls playsInline className="w-full rounded-lg bg-black max-h-[280px]" />
  );
}

function scrubMedicalTerms(input = '') {
  const text = String(input || '');
  return text;
}

export default function ProductDetailClient({
  slugOrId,
  initialProduct: initialFromServer,
  initialReviews = [],
  initialContentSettings = null,
}) {
  const storeProducts = useProductsStore((s) => s.products);
  const [apiProduct, setApiProduct] = useState(initialFromServer ?? null);
  const [productLoading, setProductLoading] = useState(!(initialFromServer ?? null) && !!slugOrId);

  useEffect(() => {
    if (!slugOrId) {
      setApiProduct(null);
      setProductLoading(false);
      return;
    }
    const serverMatches =
      initialFromServer &&
      (initialFromServer.id === slugOrId ||
        (initialFromServer.slug != null && String(initialFromServer.slug) === slugOrId));
    if (serverMatches) {
      setApiProduct(initialFromServer);
      setProductLoading(false);
      return;
    }
    let cancelled = false;
    setProductLoading(true);
    const fetchProduct = isUuid(slugOrId) ? getProductById(slugOrId) : getProductBySlug(slugOrId);
    fetchProduct
      .then((p) => {
        if (!cancelled) setApiProduct(p);
      })
      .catch(() => {
        if (!cancelled) setApiProduct(null);
      })
      .finally(() => {
        if (!cancelled) setProductLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slugOrId, initialFromServer]);

  const productFromStore = useMemo(
    () => (slugOrId ? storeProducts.find((p) => p.id === slugOrId || (p.slug && p.slug === slugOrId)) : null),
    [storeProducts, slugOrId]
  );
  const product = apiProduct ?? productFromStore;
  const formFieldSuffix = String(product?.id || slugOrId || 'p')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 64) || 'p';
  const products = apiProduct ? [apiProduct, ...storeProducts.filter((p) => p.id !== apiProduct.id)] : storeProducts;
  const variantsForProduct = Array.isArray(product?.variants) ? product.variants : [];
  const defaultVariant = useMemo(
    () => (variantsForProduct.length ? variantsForProduct.reduce(
      (best, v) => (best == null || (v.price ?? 0) < (best.price ?? 0) ? v : best),
      null,
    ) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product?.id, variantsForProduct.length],
  );
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [faqOpen, setFaqOpen] = useState(null);
  const [zoom, setZoom] = useState(false);
  const [addCartVibrate, setAddCartVibrate] = useState(false);
  const [reviews, setReviews] = useState(() => (Array.isArray(initialReviews) ? initialReviews : []));
  const [reviewsExpanded, setReviewsExpanded] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [orderNowVibrate, setOrderNowVibrate] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const router = useRouter();
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewFiles, setReviewFiles] = useState([]);
  const purchasePanelRef = useRef(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [isLg, setIsLg] = useState(false);
  const [productDisclaimerTitle, setProductDisclaimerTitle] = useState(
    () => initialContentSettings?.productDisclaimerTitle || 'Important Note',
  );
  const [productDisclaimerText, setProductDisclaimerText] = useState(
    () =>
      initialContentSettings?.productDisclaimerText ||
      'Cosmetic body oil for external use only. Not a drug. Individual experience may vary. Patch test before wider use.',
  );

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [slugOrId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const set = () => setIsLg(mq.matches);
    set();
    mq.addEventListener('change', set);
    return () => mq.removeEventListener('change', set);
  }, []);

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || !isLg) {
      setShowStickyBar(false);
      return;
    }
    const el = purchasePanelRef.current;
    if (!el) {
      setShowStickyBar(false);
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => {
        setShowStickyBar(!e.isIntersecting);
      },
      { threshold: 0, rootMargin: '-72px 0px 0px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [isLg, product?.id]);

  useEffect(() => {
    if (initialContentSettings?.productDisclaimerTitle && initialContentSettings?.productDisclaimerText) return;
    let cancelled = false;
    getContentSettings()
      .then((r) => {
        if (cancelled || !r) return;
        if (r.productDisclaimerTitle) setProductDisclaimerTitle(r.productDisclaimerTitle);
        if (r.productDisclaimerText) setProductDisclaimerText(r.productDisclaimerText);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [initialContentSettings]);

  const variant = selectedVariant ?? defaultVariant ?? product?.variants?.[0];
  const hasProductDisclaimerItems = Array.isArray(product?.disclaimerItems) && product.disclaimerItems.some((x) => String(x || '').trim().length > 0);
  const hasProductDisclaimerText = String(product?.disclaimerText || '').trim().length > 0;
  const disclaimerEnabled = !!product?.showDisclaimer || hasProductDisclaimerItems || hasProductDisclaimerText;
  const disclaimerTitleToShow = product?.disclaimerTitle || productDisclaimerTitle;
  const disclaimerItemsToShow = Array.isArray(product?.disclaimerItems) && product.disclaimerItems.length
    ? product.disclaimerItems
    : ((product?.disclaimerText || productDisclaimerText) ? [product?.disclaimerText || productDisclaimerText] : []);
  const customProductBadges = Array.isArray(product?.productBadges)
    ? product.productBadges.filter((b) => String(b?.imageUrl || '').trim())
    : [];
  const variantImageList = (variant?.images && variant.images.length) ? variant.images : (variant?.image ? [variant.image] : product?.images || []);
  useEffect(() => { setSelectedImageIndex(0); }, [variant?.id]);
  useEffect(() => { setQty(1); }, [variant?.id]);
  const rawMain = variantImageList[selectedImageIndex] || variantImageList[0] || product?.images?.[0] || '';
  const mainImage = resolveImageUrl(rawMain) || '/assets/nature-secret-logo.svg';
  const price = variant?.price ?? product?.price;
  const productDisplayName = product?.name ?? product?.slug ?? 'Product';
  const currency = useCurrencyStore((s) => s.currency);

  useEffect(() => {
    if (!product) return;
    const variants = Array.isArray(product.variants) ? product.variants : [];
    let cents = Number(product.price) || 0;
    if (variants.length > 0) {
      const vals = variants.map((v) => Number(v.price)).filter((p) => Number.isFinite(p) && p > 0);
      if (vals.length) cents = Math.min(...vals);
    }
    trackViewContent(product, cents / 100, currency);
    trackLandingPageViewForProduct(product, cents / 100, currency);
    if ((product.inventory ?? 0) === 0) trackOutOfStockView(product);
  }, [product, currency]);

  useEffect(() => {
    if (!product?.id) {
      setReviews([]);
      return;
    }
    const serverMatch =
      initialFromServer &&
      product.id === initialFromServer.id &&
      (initialFromServer.id === slugOrId ||
        (initialFromServer.slug != null && String(initialFromServer.slug) === slugOrId));
    if (serverMatch) {
      setReviews(Array.isArray(initialReviews) ? initialReviews : []);
      return;
    }
    getReviews(product.id).then(setReviews).catch(() => setReviews([]));
  }, [product?.id, slugOrId, initialFromServer, initialReviews]);

  const addToCart = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const openCart = useCartOpenStore((s) => s.open);
  const wishlist = useWishlistStore((s) => s.productIds);
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const { setLastSegmentLabel } = useBreadcrumbLabel() || {};

  function handleWishlistToggle() {
    if (!product) return;
    const willAdd = !wishlist.includes(product.id);
    toggleWishlist(product.id);
    if (willAdd) {
      const cents = Number(variant?.price ?? product.price) || 0;
      trackAddToWishlist(product, cents / 100, currency);
    }
  }

  useEffect(() => {
    if (product) {
      const slugLabel = product.slug && String(product.slug).trim() ? String(product.slug).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : productDisplayName;
      setLastSegmentLabel?.(slugLabel);
    }
    return () => setLastSegmentLabel?.(null);
  }, [product, product?.slug, productDisplayName, setLastSegmentLabel]);

  const related = useMemo(() => {
    if (!product) return [];
    return products.filter((p) => p.categoryId === product.categoryId && p.id !== product.id).slice(0, 4);
  }, [product, products]);

  const userReviewsList = useMemo(() => {
    if (!Array.isArray(reviews)) return [];
    return reviews.filter((r) => !r.collection || r.collection === 'user');
  }, [reviews]);

  const liveReviewsList = useMemo(() => {
    if (!Array.isArray(reviews)) return [];
    return reviews.filter((r) => r.collection === 'live');
  }, [reviews]);

  const fiveStarReviews = useMemo(
    () => userReviewsList.filter((r) => (r.rating || 0) >= 5),
    [userReviewsList]
  );
  const primaryReviews = fiveStarReviews.length > 0 ? fiveStarReviews : userReviewsList;
  const reviewPreviewCount = isLg ? 2 : 3;
  const visibleReviews = primaryReviews
    ? (reviewsExpanded ? primaryReviews : primaryReviews.slice(0, reviewPreviewCount))
    : [];

  if (productLoading) {
    return (
      <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8 py-3 sm:py-5">
        <InlineLoader />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8 py-6 sm:py-12 lg:py-16 text-center">
        <p className="text-sm sm:text-base text-neutral-600">This product isn&apos;t available or the catalog is updating. Try again later or browse the shop.</p>
        <Link href="/shop" className="mt-4 inline-block text-sm font-medium text-gold-700 hover:text-gold-600 border-b border-gold-500/40 pb-0.5">Back to shop</Link>
      </div>
    );
  }

  const effectiveQty = Math.max(1, Math.min(99, Number(qty) || 1));
  const compareAtForLine =
    product.variants?.length > 1 ? variant?.compareAtPrice : product.compareAtPrice;
  const stickyLineTotal = (Number(price) || 0) * effectiveQty;
  const stickyCompareLineTotal =
    compareAtForLine != null && Number(compareAtForLine) > 0
      ? Number(compareAtForLine) * effectiveQty
      : null;

  /** Cart line when product has price but no variant row (or API omits variants). */
  function getCartLinePayload() {
    const linePrice = variant?.price ?? product?.price;
    if (linePrice == null || !Number.isFinite(Number(linePrice))) return null;
    const variantId = variant?.id;
    const image =
      (variant?.images && variant.images[0]) || variant?.image || product?.images?.[0];
    return {
      productId: product.id,
      variantId,
      price: linePrice,
      name: product.name,
      image,
      qty: effectiveQty,
    };
  }

  function handleAddToCart() {
    const line = getCartLinePayload();
    if (!line) return;
    addToCart(line);
    openCart();
    trackAddToCart(product, line.price / 100, effectiveQty);
  }

  function handleOrderNow() {
    const line = getCartLinePayload();
    if (!line) return;
    const vid = line.variantId;
    const alreadyInCart = cartItems.some(
      (i) => i.productId === product.id && (i.variantId ?? '') === (vid ?? ''),
    );
    if (!alreadyInCart) {
      addToCart(line);
      trackAddToCart(product, line.price / 100, effectiveQty);
    }
    try {
      const p = router.push('/checkout');
      if (p && typeof p.then === 'function') {
        p.catch(() => {
          if (typeof window !== 'undefined') window.location.assign('/checkout');
        });
      }
    } catch {
      if (typeof window !== 'undefined') window.location.assign('/checkout');
    }
  }

  function onPickReviewMedia(e) {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setReviewFiles((prev) => [...prev, ...picked].slice(0, 4));
    e.target.value = '';
  }

  function removeReviewFile(index) {
    setReviewFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!product?.id || !reviewBody.trim()) return;
    setReviewSubmitting(true);
    setReviewMessage('');
    try {
      const media = [];
      for (const file of reviewFiles) {
        const ready = await compressReviewMediaFile(file);
        const res = await uploadReviewMedia(ready, { productId: product.id });
        media.push({ type: res.type === 'video' ? 'video' : 'image', url: res.url });
      }
      await submitReview(product.id, {
        name: reviewName.trim(),
        rating: reviewRating,
        body: reviewBody.trim(),
        media: media.length ? media : undefined,
      });
      setReviewName('');
      setReviewRating(5);
      setReviewBody('');
      setReviewFiles([]);
      setReviewMessage('Thank you. Your review is submitted and will appear after approval.');
    } catch (err) {
      setReviewMessage('Could not submit review. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
  }

  return (
    <div
      className={`mx-auto max-w-7xl px-3 sm:px-5 lg:px-8 xl:px-10 py-3 sm:py-5 lg:py-12 xl:py-14 ${
        showStickyBar ? 'lg:pb-28 xl:pb-32' : ''
      } ${product.inventory !== 0 ? 'max-lg:pb-52' : ''}`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-14 xl:gap-x-20 max-lg:gap-y-3 sm:max-lg:gap-y-4 animate-slide-up items-start">
        {/* Left: gallery (desktop = large column; mobile unchanged) */}
        <div className="relative w-full lg:max-w-xl xl:max-w-md lg:mx-0 mx-auto">
          <div
            className="aspect-square w-full rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden bg-neutral-100 relative shadow-sm lg:shadow-premium ring-1 ring-neutral-200/60"
            onMouseEnter={() => setZoom(true)}
            onMouseLeave={() => setZoom(false)}
          >
            <Image
              src={mainImage}
              alt={productDisplayName}
              fill
              className={`object-contain transition-transform duration-300 ${zoom ? 'scale-110' : ''}`}
              sizes={PRODUCT_HERO_IMAGE_SIZES}
              priority
              fetchPriority="high"
              quality={PRODUCT_HERO_IMAGE_QUALITY}
              decoding="async"
            />
            <button
              type="button"
              onClick={handleWishlistToggle}
              className="absolute top-3 right-3 z-10 p-2.5 rounded-full bg-white/90 backdrop-blur-sm shadow-md border border-neutral-200/80 hover:bg-white hover:shadow-lg transition"
              aria-label="Wishlist"
            >
              <svg className="w-5 h-5 text-neutral-700" fill={wishlist.includes(product.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
            </button>
          </div>
          <div className="mt-1.5 sm:mt-3 lg:mt-5 flex gap-1.5 sm:gap-2 lg:gap-3 overflow-x-auto pb-0.5 sm:pb-1 lg:pb-0">
            {variantImageList.map((url, i) => {
              const resolved = resolveImageUrl(url);
              return resolved ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImageIndex(i)}
                  className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 sm:h-20 sm:w-20 lg:h-[4.75rem] lg:w-[4.75rem] sm:rounded-xl ${selectedImageIndex === i ? 'border-neutral-900 ring-2 ring-neutral-400' : 'border-neutral-300'}`}
                >
                  <Image
                    src={resolved}
                    alt={`${productDisplayName} ${i + 1}`}
                    width={80}
                    height={80}
                    className="h-full w-full object-contain"
                    sizes="(max-width: 639px) 56px, (max-width: 1023px) 80px, 76px"
                    quality={65}
                    loading="lazy"
                    fetchPriority="low"
                  />
                </button>
              ) : null;
            })}
          </div>
        </div>

        <div className="min-w-0 space-y-2 sm:space-y-3 lg:space-y-5 xl:space-y-6">
          {/* Mobile / tablet: rating + price + controls */}
          <div className="lg:hidden space-y-1.5 sm:space-y-2.5">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-gold-600 text-sm sm:text-base">{'★'.repeat(Math.min(5, Math.round(Number(product.rating) || 0)))}</span>
              <span className="text-neutral-300 text-sm sm:text-base">{'★'.repeat(5 - Math.min(5, Math.round(Number(product.rating) || 0)))}</span>
              <span className="text-[11px] sm:text-xs text-neutral-500">({product.reviewCount} reviews)</span>
            </div>
            <p className="text-lg sm:text-xl font-semibold text-neutral-900 tabular-nums leading-tight">
              {(product.variants?.length > 1 ? variant?.compareAtPrice : product.compareAtPrice) && (
                <span className="text-neutral-500 line-through mr-1.5 sm:mr-2 text-sm sm:text-base font-medium">{formatPrice(product.variants?.length > 1 ? variant?.compareAtPrice : product.compareAtPrice, currency)}</span>
              )}
              {formatPrice(price, currency)}
            </p>
          </div>

          {/* Desktop: purchase column (scrolls with page; disclaimer below description, not sticky) */}
          <div
            ref={purchasePanelRef}
            className="max-lg:hidden block space-y-3 xl:space-y-4 pb-6 lg:pb-8 rounded-2xl lg:pl-0 xl:pl-1"
          >
            <div>
              <h1 className="text-3xl xl:text-[2.125rem] font-semibold text-neutral-900 tracking-tight leading-[1.15]">{productDisplayName}</h1>
              {(product.badge || product.badgeSub) && (
                <div className="mt-2.5 xl:mt-3 flex flex-wrap gap-2">
                  {product.badge && <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white">{product.badge}</span>}
                  {product.badgeSub && <span className="rounded-full border border-gold-500/60 bg-gold-50 px-3 py-1 text-xs font-medium text-neutral-900">{product.badgeSub}</span>}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:gap-2.5 pt-0.5">
              <span className="text-gold-600 text-lg xl:text-xl">{'★'.repeat(Math.min(5, Math.round(Number(product.rating) || 0)))}</span>
              <span className="text-neutral-300 text-lg xl:text-xl">{'★'.repeat(5 - Math.min(5, Math.round(Number(product.rating) || 0)))}</span>
              <span className="text-sm text-neutral-500">({product.reviewCount} reviews)</span>
            </div>
            <p className="text-2xl xl:text-[1.75rem] font-semibold text-neutral-900 pt-1 tabular-nums">
              {(product.variants?.length > 1 ? variant?.compareAtPrice : product.compareAtPrice) && (
                <span className="text-neutral-500 line-through mr-2 text-lg xl:text-xl">{formatPrice(product.variants?.length > 1 ? variant?.compareAtPrice : product.compareAtPrice, currency)}</span>
              )}
              {formatPrice(price, currency)}
            </p>
            {product.description && (
              <div className="pt-1 lg:pt-2">
                <div
                  className={`text-sm xl:text-[15px] text-neutral-600 leading-relaxed lg:leading-[1.65] product-description transition-all lg:[&_p]:text-[15px] lg:[&_li]:text-[15px] xl:[&_p]:text-[15px] xl:[&_li]:text-[15px] ${
                    descriptionExpanded ? '' : 'line-clamp-3 max-h-[4.5rem] overflow-hidden'
                  }`}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(scrubMedicalTerms(product.description)) }}
                />
                <button
                  type="button"
                  onClick={() => setDescriptionExpanded((v) => !v)}
                  className="mt-2 text-xs font-medium text-gold-700 hover:text-gold-600 border-b border-gold-500/50 pb-0.5"
                >
                  {descriptionExpanded ? 'Read less' : 'Read more'}
                </button>
              </div>
            )}
            {disclaimerEnabled ? (
              <div className="rounded-xl border-2 border-gold-300/70 bg-gold-50/60 px-3 py-2.5 shadow-gold-sm">
                <p className="text-[11px] font-semibold text-neutral-900">{disclaimerTitleToShow}</p>
                <ul className="mt-1.5 space-y-1 text-[11px] text-neutral-700 leading-relaxed list-disc pl-4">
                  {disclaimerItemsToShow.map((item, idx) => (
                    <li key={`d-${idx}-${item.slice(0, 12)}`}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {product.variants?.length > 1 && (
              <div className="pt-1 lg:pt-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Size / Variant</p>
                <div className="flex flex-wrap gap-2 lg:gap-2.5">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`rounded-full sm:rounded-2xl border-2 px-4 py-2 text-sm font-medium transition ${
                        variant?.id === v.id ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm' : 'border-neutral-200 text-neutral-700 hover:border-neutral-300 bg-white'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="pt-0.5 lg:pt-1">
              <label
                htmlFor={`product-qty-${formFieldSuffix}`}
                className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2"
              >
                Quantity
              </label>
              <div className="inline-flex items-stretch overflow-hidden rounded-full border-2 border-neutral-200 bg-white">
                <button
                  type="button"
                  onClick={() => setQty((n) => Math.max(1, (n || 1) - 1))}
                  className="w-11 shrink-0 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 text-lg leading-none"
                  aria-label="Decrease"
                >
                  −
                </button>
                <div className="flex min-w-[3rem] items-center justify-center border-y border-neutral-100 bg-transparent px-1">
                  <input
                    id={`product-qty-${formFieldSuffix}`}
                    name="quantity"
                    type="number"
                    min={1}
                    max={99}
                    value={effectiveQty}
                    onChange={(e) => setQty(Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1)))}
                    className="w-full min-w-0 text-center text-sm font-semibold tabular-nums text-neutral-900 border-0 bg-transparent p-0 m-0 h-11 leading-none align-middle focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setQty((n) => Math.min(99, (n || 1) + 1))}
                  className="w-11 shrink-0 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 text-lg leading-none"
                  aria-label="Increase"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 lg:gap-3 pt-1 lg:pt-2">
              {product.inventory === 0 ? (
                <span className="rounded-2xl border border-neutral-200 bg-neutral-100 py-3 lg:py-3.5 text-center text-sm font-medium text-neutral-500">
                  Out of stock
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      handleAddToCart();
                      setAddCartVibrate(true);
                      setTimeout(() => setAddCartVibrate(false), 400);
                    }}
                    className={`w-full rounded-full sm:rounded-2xl bg-neutral-900 py-3.5 lg:py-4 text-sm font-semibold text-white hover:bg-neutral-800 transition shadow-md ${
                      addCartVibrate ? 'animate-vibrate' : 'animate-cta-attract hover:animate-none'
                    }`}
                  >
                    Add to cart
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleOrderNow();
                      setOrderNowVibrate(true);
                      setTimeout(() => setOrderNowVibrate(false), 400);
                    }}
                    className={`w-full rounded-full sm:rounded-2xl bg-gold-500 py-3 lg:py-3.5 text-sm font-semibold text-neutral-900 hover:bg-gold-600 transition shadow-gold-md checkout-cta-animated cta-shimmer-gold ${
                      orderNowVibrate ? 'animate-vibrate' : 'animate-gold-pulse hover:animate-none'
                    }`}
                  >
                    <span className="relative z-10">Order now — Cash on delivery</span>
                  </button>
                </>
              )}
              <p className="text-xs font-medium text-gold-700 flex items-center gap-1.5 pt-1 lg:pt-1.5">
                <svg className="w-4 h-4 text-gold-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1h-1m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
                Free shipping
              </p>
            </div>
          </div>

          {/* Mobile / tablet: free shipping + out of stock (variant & qty live in fixed bottom bar) */}
          <div className="space-y-2 lg:hidden">
            <div className="pt-0 sm:pt-0.5">
              <p className="text-[11px] sm:text-xs font-medium text-neutral-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1h-1m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
                Free shipping
              </p>
              {product.inventory === 0 && (
                <span className="mt-2 sm:mt-3 block rounded-xl border border-neutral-200 bg-neutral-100 py-2.5 sm:py-3 text-center text-xs sm:text-sm font-medium text-neutral-500">
                  Out of stock
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: FAQ + policies only */}
      <section className="max-lg:hidden block mt-16 xl:mt-20 pt-12 xl:pt-16 border-t border-neutral-200">
        {(product.faq || []).length > 0 && (
          <div>
            <h3 className="text-base font-semibold text-neutral-900 mb-4 xl:mb-5 tracking-tight">FAQ</h3>
            <ul className="space-y-1 max-w-2xl xl:max-w-3xl">
              {(product.faq || []).map((item, i) => (
                <li key={i} className="border-b border-neutral-100">
                  <button type="button" onClick={() => setFaqOpen(faqOpen === i ? null : i)} className="w-full py-3.5 xl:py-4 text-left text-sm text-neutral-700 flex justify-between gap-4 font-medium">
                    <span className="min-w-0 pr-2">{scrubMedicalTerms(item.q)}</span><span className="shrink-0">{faqOpen === i ? '−' : '+'}</span>
                  </button>
                  {faqOpen === i && <p className="pb-3.5 xl:pb-4 text-sm text-neutral-500 leading-relaxed max-w-2xl">{scrubMedicalTerms(item.a)}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className={`rounded-2xl bg-neutral-50 border border-neutral-100 p-6 xl:p-8 text-sm xl:text-[15px] text-neutral-600 space-y-3 leading-relaxed max-w-2xl xl:max-w-3xl ${(product.faq || []).length ? 'mt-10 xl:mt-12' : ''}`}>
          <p><strong>Shipping:</strong> {SHIPPING_POLICY}</p>
          <p><strong>Returns:</strong> {RETURN_POLICY}</p>
        </div>
        {customProductBadges.length > 0 ? (
          <div className="mt-6 xl:mt-8 flex flex-wrap items-center" style={{ gap: 10 }}>
            {customProductBadges.map((b, idx) => {
              const src = resolveImageUrl(b.imageUrl);
              const alt = String(b.label || 'Badge').trim() || 'Badge';
              const img = (
                <img
                  src={src}
                  alt={alt}
                  width={124}
                  height={124}
                  className="h-[124px] w-[124px] object-contain"
                  loading="lazy"
                />
              );
              return b.href ? (
                <a
                  key={`badge-${idx}`}
                  href={b.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 hover:opacity-90"
                >
                  {img}
                </a>
              ) : (
                <span key={`badge-${idx}`} className="shrink-0">
                  {img}
                </span>
              );
            })}
        </div>
        ) : null}
      </section>

      {/* Product details: name, description, FAQs (mobile / tablet) */}
      <section className="mt-5 sm:mt-8 lg:mt-16 pt-5 sm:pt-8 lg:pt-12 border-t border-neutral-200 lg:hidden">
        <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 leading-snug tracking-tight">{productDisplayName}</h2>
        {(product.badge || product.badgeSub) && (
          <div className="mt-1.5 sm:mt-2 flex flex-wrap gap-1.5 sm:gap-2">
            {product.badge && <span className="rounded-full bg-neutral-900 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-medium text-white">{product.badge}</span>}
            {product.badgeSub && <span className="rounded-full border border-gold-500/60 bg-gold-50 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-medium text-neutral-900">{product.badgeSub}</span>}
          </div>
        )}
        {product.description && (
            <div className="mt-3 sm:mt-4">
            <div
              className={`text-[13px] sm:text-sm text-neutral-600 leading-relaxed product-description transition-all max-lg:[&_p]:text-[13px] max-lg:[&_li]:text-[13px] sm:[&_p]:text-sm sm:[&_li]:text-sm ${
                descriptionExpanded ? '' : 'max-h-52 sm:max-h-64 overflow-hidden'
              }`}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(scrubMedicalTerms(product.description)) }}
            />
            <button
              type="button"
              onClick={() => setDescriptionExpanded((v) => !v)}
              className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs font-medium text-gold-700 hover:text-gold-600 border-b border-gold-500/50 pb-0.5"
            >
              {descriptionExpanded ? 'View less' : 'View more'}
            </button>
          </div>
        )}
        {disclaimerEnabled ? (
          <div className="mt-3 sm:mt-4 rounded-xl border-2 border-gold-300/70 bg-gold-50/60 px-3 py-2.5 shadow-gold-sm">
            <p className="text-[11px] sm:text-xs font-semibold text-neutral-900">{disclaimerTitleToShow}</p>
            <ul className="mt-1.5 space-y-1 text-[11px] sm:text-sm text-neutral-700 leading-relaxed list-disc pl-4">
              {disclaimerItemsToShow.map((item, idx) => (
                <li key={`m-d-${idx}-${item.slice(0, 12)}`}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {(product.faq || []).length > 0 && (
          <div className="mt-5 sm:mt-8">
            <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 mb-2 sm:mb-3 tracking-tight">FAQ</h3>
            <ul className="space-y-0.5 sm:space-y-1">
              {(product.faq || []).map((item, i) => (
                <li key={i} className="border-b border-neutral-100">
                  <button type="button" onClick={() => setFaqOpen(faqOpen === i ? null : i)} className="w-full py-2.5 sm:py-3 text-left text-xs sm:text-sm font-medium text-neutral-700 flex justify-between gap-2">
                    <span className="min-w-0 pr-2">{scrubMedicalTerms(item.q)}</span><span className="shrink-0">{faqOpen === i ? '−' : '+'}</span>
                  </button>
                  {faqOpen === i && <p className="pb-2.5 sm:pb-3 text-xs sm:text-sm text-neutral-500 leading-relaxed">{scrubMedicalTerms(item.a)}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-4 sm:mt-6 rounded-xl sm:rounded-2xl bg-neutral-100 p-3 sm:p-4 text-xs sm:text-sm text-neutral-600 space-y-1.5 sm:space-y-2 leading-relaxed">
          <p><strong>Shipping:</strong> {SHIPPING_POLICY}</p>
          <p><strong>Returns:</strong> {RETURN_POLICY}</p>
        </div>
        {customProductBadges.length > 0 ? (
          <div className="mt-3 sm:mt-4 flex flex-wrap items-center" style={{ gap: 10 }}>
            {customProductBadges.map((b, idx) => {
              const src = resolveImageUrl(b.imageUrl);
              const alt = String(b.label || 'Badge').trim() || 'Badge';
              const img = (
                <img
                  src={src}
                  alt={alt}
                  width={124}
                  height={124}
                  className="h-[124px] w-[124px] object-contain"
                  loading="lazy"
                />
              );
              return b.href ? (
                <a
                  key={`badge-m-${idx}`}
                  href={b.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 hover:opacity-90"
                >
                  {img}
                </a>
              ) : (
                <span key={`badge-m-${idx}`} className="shrink-0">
                  {img}
                </span>
              );
            })}
        </div>
        ) : null}
      </section>

      {/* Write review + recent reviews */}
      <section className="mt-6 sm:mt-10 lg:mt-16 xl:mt-20 pt-6 sm:pt-10 lg:pt-14 xl:pt-16 border-t border-neutral-200">
        <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-neutral-900 mb-3 sm:mb-4 lg:mb-6 tracking-tight">Reviews</h3>
        {liveReviewsList.length > 0 ? (
          <div className="mb-6 sm:mb-8 lg:mb-10">
            <h4 className="text-sm sm:text-base font-semibold text-neutral-900 mb-3 sm:mb-4">Customer stories</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {liveReviewsList.map((r) => (
                <article
                  key={r.id}
                  className="rounded-xl sm:rounded-2xl border border-neutral-200 bg-white p-3 sm:p-4 shadow-sm"
                >
                  {Array.isArray(r.media) && r.media.length > 0 ? (
                    <div className="space-y-2 mb-3">
                      {r.media.map((m, i) => (
                        <ReviewMediaBlock
                          key={`${r.id}-m-${i}-${m.url?.slice?.(0, 24) || i}`}
                          item={m}
                          resolveImageUrl={resolveImageUrl}
                        />
                      ))}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                    <span className="text-gold-600 text-sm">{'★'.repeat(Math.min(5, r.rating || 0))}</span>
                    <span className="text-neutral-400 text-sm">{'★'.repeat(5 - Math.min(5, r.rating || 0))}</span>
                    <span className="text-xs sm:text-sm font-medium text-neutral-800">{r.authorName}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">{scrubMedicalTerms(r.body)}</p>
                </article>
              ))}
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-10 xl:gap-14">
          <div>
            <p className="text-xs sm:text-sm lg:text-base text-neutral-600 mb-2 sm:mb-3 lg:mb-4 leading-snug lg:leading-relaxed">Share your experience with this product.</p>
            <form onSubmit={handleSubmitReview} className="space-y-2 sm:space-y-3 lg:space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-4">
                <div className="flex-1">
                  <label
                    htmlFor={`product-review-name-${formFieldSuffix}`}
                    className="block text-[10px] sm:text-xs lg:text-sm font-medium text-neutral-700 mb-0.5 sm:mb-1 lg:mb-1.5"
                  >
                    Your name
                  </label>
                  <input
                    id={`product-review-name-${formFieldSuffix}`}
                    name="authorName"
                    type="text"
                    autoComplete="name"
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-lg sm:rounded-xl border border-neutral-600 sm:border-2 sm:border-neutral-600 px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5 text-xs sm:text-sm lg:text-base text-neutral-900"
                  />
                </div>
                <div className="w-full sm:w-40 lg:w-44">
                  <label
                    htmlFor={`product-review-rating-${formFieldSuffix}`}
                    className="block text-[10px] sm:text-xs lg:text-sm font-medium text-neutral-700 mb-0.5 sm:mb-1 lg:mb-1.5"
                  >
                    Rating
                  </label>
                  <select
                    id={`product-review-rating-${formFieldSuffix}`}
                    name="rating"
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value) || 5)}
                    className="w-full rounded-lg sm:rounded-xl border border-neutral-600 sm:border-2 sm:border-neutral-600 px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5 text-xs sm:text-sm lg:text-base text-neutral-900"
                  >
                    {[5, 4, 3, 2, 1].map((v) => (
                      <option key={v} value={v}>{`${v} star${v > 1 ? 's' : ''}`}</option>
                    ))}
                  </select>
                </div>
              </div>
            <div className="mt-2 sm:mt-3 lg:mt-4">
              <label
                htmlFor={`product-review-body-${formFieldSuffix}`}
                className="block text-[10px] sm:text-xs lg:text-sm font-medium text-neutral-700 mb-0.5 sm:mb-1 lg:mb-1.5"
              >
                Your review
              </label>
              <textarea
                id={`product-review-body-${formFieldSuffix}`}
                name="review"
                autoComplete="off"
                value={reviewBody}
                onChange={(e) => setReviewBody(e.target.value)}
                rows={4}
                required
                placeholder="How did this product help you?"
                className="w-full rounded-lg sm:rounded-xl border border-neutral-600 sm:border-2 sm:border-neutral-600 px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-3 text-xs sm:text-sm lg:text-base text-neutral-900 min-h-[5.5rem] sm:min-h-0 lg:min-h-[7rem]"
              />
            </div>
            <div className="mt-2 sm:mt-3">
              <label
                htmlFor={`product-review-media-${formFieldSuffix}`}
                className="block text-[10px] sm:text-xs lg:text-sm font-medium text-neutral-700 mb-1"
              >
                Photos or video (optional, max 4)
              </label>
              <input
                id={`product-review-media-${formFieldSuffix}`}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                multiple
                onChange={onPickReviewMedia}
                className="block w-full text-[11px] sm:text-xs text-neutral-600 file:mr-2 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-2 file:py-1 file:text-neutral-800"
              />
              {reviewFiles.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {reviewFiles.map((file, i) => (
                    <li
                      key={`${file.name}-${i}`}
                      className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-[10px] sm:text-xs text-neutral-700 max-w-full"
                    >
                      <span className="truncate">{file.name}</span>
                      <button type="button" className="shrink-0 text-red-600 hover:underline" onClick={() => removeReviewFile(i)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {reviewMessage && (
              <p className="mt-1.5 sm:mt-2 lg:mt-2.5 text-[11px] sm:text-xs lg:text-sm text-neutral-500">{reviewMessage}</p>
            )}
            <button
              type="submit"
              disabled={reviewSubmitting || !reviewBody.trim()}
              className="mt-2 sm:mt-3 lg:mt-4 inline-flex items-center justify-center rounded-full sm:rounded-2xl bg-neutral-900 px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 text-xs sm:text-sm lg:text-base font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              {reviewSubmitting ? 'Submitting…' : 'Submit review'}
            </button>
            </form>
          </div>
          <div>
            {primaryReviews && primaryReviews.length > 0 ? (
              <div className="space-y-3 sm:space-y-4 lg:space-y-5">
                <p className="text-xs sm:text-sm lg:text-base font-medium text-neutral-700">
                  Recent reviews{fiveStarReviews.length > 0 ? ' (5-star highlights)' : ''}
                </p>
                {visibleReviews.map((r) => (
                  <div key={r.id} className="rounded-lg sm:rounded-xl border border-neutral-100 bg-neutral-50/50 p-3 sm:p-4 lg:p-5">
                    {Array.isArray(r.media) && r.media.length > 0 ? (
                      <div className="space-y-2 mb-2 sm:mb-3">
                        {r.media.map((m, mi) => (
                          <ReviewMediaBlock
                            key={`${r.id}-um-${mi}`}
                            item={m}
                            resolveImageUrl={resolveImageUrl}
                          />
                        ))}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 lg:gap-2.5 mb-1.5 sm:mb-2 lg:mb-2.5">
                      <span className="text-gold-600 text-sm sm:text-base lg:text-lg">{'★'.repeat(Math.min(5, r.rating || 0))}</span>
                      <span className="text-neutral-400 text-sm sm:text-base lg:text-lg">{'★'.repeat(5 - Math.min(5, r.rating || 0))}</span>
                      <span className="text-xs sm:text-sm lg:text-base font-medium text-neutral-700">{r.authorName}</span>
                    </div>
                    <p className="text-xs sm:text-sm lg:text-[15px] text-neutral-600 leading-relaxed lg:leading-[1.65]">{scrubMedicalTerms(r.body)}</p>
                  </div>
                ))}
                {primaryReviews.length > reviewPreviewCount && (
                  <button
                    type="button"
                    onClick={() => setReviewsExpanded((v) => !v)}
                    className="text-xs sm:text-sm lg:text-base font-medium text-gold-700 hover:text-gold-600 border-b border-gold-500/50 pb-0.5"
                  >
                    {reviewsExpanded
                      ? 'View less'
                      : isLg
                        ? `View all reviews (${primaryReviews.length - reviewPreviewCount} more)`
                        : `View more reviews (${primaryReviews.length - reviewPreviewCount} more)`}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs sm:text-sm lg:text-base text-neutral-500 leading-snug lg:leading-relaxed">
                {liveReviewsList.length > 0
                  ? 'No community reviews yet. Be the first to leave one.'
                  : 'No reviews yet. Be the first to review this product.'}
              </p>
            )}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-6 sm:mt-12 lg:mt-20 xl:mt-24 pt-6 sm:pt-10 lg:pt-16 xl:pt-20 border-t border-neutral-200">
          <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-[1.75rem] font-semibold text-neutral-900 mb-3 sm:mb-6 lg:mb-8 xl:mb-10 tracking-tight">You may also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 xl:gap-8">
            {related.map((p, i) => {
              const img = resolveImageUrl(p.images?.[0]) || '/assets/nature-secret-logo.svg';
              const name = p.name ?? p.slug ?? 'Product';
              return (
                <Link key={p.id} href={`/shop/${productPath(p)}`} className="group animate-stagger-in opacity-0" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="aspect-square rounded-xl sm:rounded-2xl lg:rounded-2xl overflow-hidden bg-neutral-100">
                    <Image
                      src={img}
                      alt={name}
                      width={300}
                      height={300}
                      className="h-full w-full object-contain group-hover:scale-105 transition duration-300"
                      sizes="(max-width: 767px) 50vw, (max-width: 1023px) 25vw, 300px"
                      quality={75}
                    />
                  </div>
                  <p className="mt-2 sm:mt-3 lg:mt-4 text-xs sm:text-sm lg:text-base font-medium text-neutral-900 line-clamp-2 leading-snug">{name}</p>
                  <p className="text-[11px] sm:text-sm lg:text-base text-neutral-500 tabular-nums mt-0.5 lg:mt-1">{formatPrice(p.price, currency)}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Mobile / tablet: compact fixed bottom — variant, qty + subtotal row, 2-col CTAs */}
      {product.inventory !== 0 && (
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-white/95 backdrop-blur-md shadow-[0_-2px_16px_rgba(0,0,0,0.06)] px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          role="region"
          aria-label="Purchase options"
        >
          <div className="mx-auto max-w-7xl flex flex-col gap-1.5">
            {product.variants?.length > 1 && (
              <div>
                <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-0.5">Size / Variant</p>
                <div className="flex flex-wrap gap-1">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`rounded-full sm:rounded-2xl border px-2 py-1 text-[11px] font-medium transition ${
                        variant?.id === v.id ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 text-neutral-700 bg-white'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <label
                  htmlFor={`product-qty-sticky-${formFieldSuffix}`}
                  className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider shrink-0"
                >
                  Qty
                </label>
                <div className="inline-flex items-stretch overflow-hidden rounded-full border border-neutral-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setQty((n) => Math.max(1, (n || 1) - 1))}
                    className="w-8 h-8 shrink-0 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 text-base leading-none"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <div className="flex min-w-[2rem] items-center justify-center border-x border-neutral-100 bg-transparent px-0.5">
                    <input
                    id={`product-qty-sticky-${formFieldSuffix}`}
                    name="quantitySticky"
                      type="number"
                      min={1}
                      max={99}
                      value={effectiveQty}
                      onChange={(e) => setQty(Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1)))}
                      className="w-full min-w-0 text-center text-xs font-semibold tabular-nums text-neutral-900 border-0 bg-transparent p-0 m-0 h-8 leading-none align-middle focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setQty((n) => Math.min(99, (n || 1) + 1))}
                    className="w-8 h-8 shrink-0 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 text-base leading-none"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="text-right shrink-0 pl-1">
                {effectiveQty > 1 && (
                  <p className="text-[10px] text-neutral-500 tabular-nums leading-tight">
                    {effectiveQty} × {formatPrice(price, currency)}
                  </p>
                )}
                {stickyCompareLineTotal != null &&
                  stickyCompareLineTotal > stickyLineTotal &&
                  Number.isFinite(stickyCompareLineTotal) && (
                    <span className="block text-[11px] text-neutral-500 line-through tabular-nums leading-tight">
                      {formatPrice(stickyCompareLineTotal, currency)}
                    </span>
                  )}
                <p className="text-base font-semibold text-neutral-900 tabular-nums leading-tight">
                  {formatPrice(stickyLineTotal, currency)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  handleAddToCart();
                  setAddCartVibrate(true);
                  setTimeout(() => setAddCartVibrate(false), 400);
                }}
                className={`min-h-[3rem] flex items-center justify-center rounded-full sm:rounded-2xl bg-neutral-900 px-2 text-xs font-semibold text-white hover:bg-neutral-800 transition shadow-sm ${
                  addCartVibrate ? 'animate-vibrate' : 'animate-cta-attract hover:animate-none'
                }`}
              >
                Add to cart
              </button>
              <button
                type="button"
                onClick={() => {
                  handleOrderNow();
                  setOrderNowVibrate(true);
                  setTimeout(() => setOrderNowVibrate(false), 400);
                }}
                className={`min-h-[3rem] flex flex-col items-center justify-center gap-0 rounded-full sm:rounded-2xl bg-gold-500 px-1.5 py-1 text-center text-xs font-semibold text-neutral-900 hover:bg-gold-600 transition shadow-gold-sm leading-tight checkout-cta-animated cta-shimmer-gold ${
                  orderNowVibrate ? 'animate-vibrate' : 'animate-gold-pulse hover:animate-none'
                }`}
              >
                <span className="relative z-10">Order now</span>
                <span className="relative z-10 text-[10px] font-medium text-neutral-800/90">Cash on delivery</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop: sticky bottom bar when purchase panel scrolls out */}
      {showStickyBar && product.inventory !== 0 && (
        <div
          className="max-lg:hidden flex fixed bottom-0 left-0 right-0 z-50 items-center justify-between gap-4 px-6 xl:px-10 py-3.5 xl:py-4 border-t border-neutral-200 bg-white/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
          role="region"
          aria-label="Quick purchase"
        >
          <div className="max-w-7xl mx-auto w-full flex flex-wrap items-center justify-between gap-4 xl:gap-6">
            <p className="text-lg xl:text-xl font-semibold text-neutral-900 tabular-nums">
              {(product.variants?.length > 1 ? variant?.compareAtPrice : product.compareAtPrice) && (
                <span className="text-neutral-500 line-through text-sm mr-2">{formatPrice(product.variants?.length > 1 ? variant?.compareAtPrice : product.compareAtPrice, currency)}</span>
              )}
              {formatPrice(price, currency)}
            </p>
            <div className="flex items-center gap-3 flex-1 justify-end min-w-[280px]">
              <button
                type="button"
                onClick={() => {
                  handleAddToCart();
                  setAddCartVibrate(true);
                  setTimeout(() => setAddCartVibrate(false), 400);
                }}
                className={`rounded-full sm:rounded-2xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 transition shadow-md min-w-[140px] ${
                  addCartVibrate ? 'animate-vibrate' : 'animate-cta-attract hover:animate-none'
                }`}
              >
                Add to cart
              </button>
              <button
                type="button"
                onClick={() => {
                  handleOrderNow();
                  setOrderNowVibrate(true);
                  setTimeout(() => setOrderNowVibrate(false), 400);
                }}
                className={`rounded-full sm:rounded-2xl bg-gold-500 px-5 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-gold-600 transition shadow-gold-md min-w-[120px] checkout-cta-animated cta-shimmer-gold ${
                  orderNowVibrate ? 'animate-vibrate' : 'animate-gold-pulse hover:animate-none'
                }`}
              >
                <span className="relative z-10">Buy now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
