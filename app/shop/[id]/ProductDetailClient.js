'use client';

import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect, useLayoutEffect, useRef, memo } from 'react';
import Link from '@/components/Link';
import Image, { getImageProps } from 'next/image';
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
import { getDefaultHeroImageSrcForProduct } from '@/lib/productImageResolve';
import { InlineLoader, Spinner } from '@/components/ui/PageLoader';
import {
  extractIntroParagraphsFromDescription,
  extractHowToUseSteps,
  extractKeyBenefitLines,
  parseHighlightLine,
  reviewerInitials,
  pickBestValueVariantId,
} from '@/lib/productDetailMobileParse';

const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

const ProductRatingSummary = memo(function ProductRatingSummary({ product, starClassName = '', countClassName = '', className = 'flex flex-wrap items-center justify-end gap-x-1' }) {
  const r = Math.min(5, Math.round(Number(product?.rating) || 0));
  return (
    <div className={className}>
      <span className={`text-amber-500 ${starClassName}`}>{'★'.repeat(r)}</span>
      <span className={`text-neutral-300 ${starClassName}`}>{'★'.repeat(5 - r)}</span>
      <span className={`text-neutral-500 ${countClassName}`}>({product?.reviewCount ?? 0} reviews)</span>
    </div>
  );
});

const ProductTrustBar = memo(function ProductTrustBar({ product, className = '', variant = 'text' }) {
  const n = product?.reviewCount != null && product.reviewCount > 0 ? product.reviewCount : 37;
  const labels = ['Cash on Delivery', 'Free Shipping', `${n} Verified Reviews`];
  if (variant === 'pills') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`} role="group" aria-label="Trust highlights">
        {labels.map((label) => (
          <span
            key={label}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200/70 bg-white px-3.5 py-2 text-[11px] font-medium leading-snug tracking-wide text-neutral-700 shadow-sm"
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neutral-200/80 bg-accent-cream text-[10px] font-bold text-neutral-800"
              aria-hidden
            >
              ✓
            </span>
            {label}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] sm:text-xs text-neutral-700 ${className}`}
      role="group"
      aria-label="Trust highlights"
    >
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium">
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-200 bg-white text-[10px] text-neutral-700" aria-hidden>
          ✓
        </span>
        Cash on Delivery
      </span>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium">
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-200 bg-white text-[10px] text-neutral-700" aria-hidden>
          ✓
        </span>
        Free Shipping
      </span>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium">
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-200 bg-white text-[10px] text-neutral-700" aria-hidden>
          ✓
        </span>
        {n} Verified Reviews
      </span>
    </div>
  );
});

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

const ReviewMediaBlock = memo(function ReviewMediaBlock({ item, resolveImageUrl }) {
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
});

function scrubMedicalTerms(input = '') {
  const text = String(input || '');
  return text;
}

/** PDP Order Now: build cart line from latest ref snapshot (avoids stale closure while view finishes loading). */
function buildOrderNowLineFromCtx(ctx) {
  if (!ctx?.product?.id) return null;
  const p = ctx.product;
  const v = ctx.variant;
  const eq = Math.max(1, Math.min(99, Number(ctx.qtyEffective) || 1));
  const linePrice = v?.price ?? p?.price;
  if (linePrice == null || !Number.isFinite(Number(linePrice))) return null;
  const image = (v?.images && v.images[0]) || v?.image || p?.images?.[0];
  return {
    productId: p.id,
    variantId: v?.id,
    price: linePrice,
    name: p.name,
    image,
    qty: eq,
  };
}

export default function ProductDetailClient({
  slugOrId,
  initialProduct: initialFromServer,
  initialReviews = [],
  initialContentSettings = null,
  children: serverHeroImage,
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
  const [orderNowNavigating, setOrderNowNavigating] = useState(false);
  const orderNowNavBusyRef = useRef(false);
  const orderNowLiveRef = useRef({
    productLoading: true,
    product: null,
    variant: null,
    qtyEffective: 1,
    currency: 'PKR',
  });
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const router = useRouter();
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewFiles, setReviewFiles] = useState([]);
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
  const galleryResolvedUrls = useMemo(() => {
    const list = (variant?.images && variant.images.length) ? variant.images : (variant?.image ? [variant.image] : product?.images || []);
    return list.map((u) => resolveImageUrl(u)).filter(Boolean);
  }, [product?.id, variant?.id, variant?.images, variant?.image, product?.images]);
  useEffect(() => {
    if (typeof window === 'undefined' || !galleryResolvedUrls.length) return;
    const unique = [...new Set(galleryResolvedUrls)];
    const links = [];
    for (const href of unique.slice(0, 1)) {
      try {
        const { props } = getImageProps({
          src: href,
          alt: '',
          width: 1200,
          height: 1200,
          sizes: PRODUCT_HERO_IMAGE_SIZES,
          quality: PRODUCT_HERO_IMAGE_QUALITY,
        });
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = props.src;
        if (props.srcSet) {
          link.setAttribute('imagesrcset', props.srcSet);
          link.setAttribute('imagesizes', props.sizes || PRODUCT_HERO_IMAGE_SIZES);
        }
        document.head.appendChild(link);
        links.push(link);
      } catch {
        const img = new Image();
        img.src = href;
      }
    }
    return () => {
      for (const l of links) l.remove();
    };
  }, [galleryResolvedUrls]);
  useEffect(() => { setSelectedImageIndex(0); }, [variant?.id]);
  useEffect(() => { setQty(1); }, [variant?.id]);
  const rawMain = variantImageList[selectedImageIndex] || variantImageList[0] || product?.images?.[0] || '';
  const mainImage = resolveImageUrl(rawMain) || '/assets/nature-secret-logo.svg';
  const defaultHeroAbs = product ? getDefaultHeroImageSrcForProduct(product) : '';
  const serverHeroValid =
    !!serverHeroImage &&
    !!defaultHeroAbs &&
    !defaultHeroAbs.includes('/assets/nature-secret-logo') &&
    mainImage === defaultHeroAbs;
  const clientHeroNeedsPriority =
    !serverHeroValid &&
    !!defaultHeroAbs &&
    mainImage === defaultHeroAbs &&
    !defaultHeroAbs.includes('/assets/nature-secret-logo');
  const price = variant?.price ?? product?.price;
  const productDisplayName = product?.name ?? product?.slug ?? 'Product';
  const currency = useCurrencyStore((s) => s.currency);
  const effectiveQtyLive = Math.max(1, Math.min(99, Number(qty) || 1));
  orderNowLiveRef.current = {
    productLoading,
    product,
    variant,
    qtyEffective: effectiveQtyLive,
    currency,
  };

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

  const addItemIfNew = useCartStore((s) => s.addItemIfNew);
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

  const introParagraphs = useMemo(
    () => (product?.description ? extractIntroParagraphsFromDescription(product.description) : []),
    [product?.description],
  );
  const howToSteps = useMemo(
    () => (product?.description ? extractHowToUseSteps(product.description) : []),
    [product?.description],
  );
  const keyBenefitCards = useMemo(() => {
    if (!product) return [];
    const lines = product.description ? extractKeyBenefitLines(product.description) : [];
    if (lines.length) return lines.map((line) => parseHighlightLine(line));
    return (product.benefits || []).map((b) => ({ icon: '🌿', title: String(b), desc: '' }));
  }, [product, product?.description, product?.benefits]);
  const bestValueVariantId = useMemo(() => pickBestValueVariantId(product?.variants), [product?.variants]);
  const proTipHtml = useMemo(() => {
    if (!product?.description) return '';
    const m = product.description.match(/<p>[\s\S]*?(?:Pro Tip|💡)[\s\S]*?<\/p>/i);
    if (!m) return '';
    return sanitizeHtml(scrubMedicalTerms(m[0]));
  }, [product?.description]);
  const sanitizedProductDescriptionHtml = useMemo(
    () => (product?.description ? sanitizeHtml(scrubMedicalTerms(product.description)) : ''),
    [product?.description],
  );

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
        <Link href="/shop" className="mt-4 inline-block text-sm font-medium text-neutral-900 border-b border-neutral-900/25 pb-0.5 hover:border-neutral-900">Back to shop</Link>
      </div>
    );
  }

  const effectiveQty = Math.max(1, Math.min(99, Number(qty) || 1));
  const variantCount = product.variants?.length ?? 0;
  /** Show size/SKU UI whenever the API sent at least one variant row (including single-SKU). */
  const showVariantPicker = variantCount > 0;
  const compareAtForLine =
    variantCount > 0 ? variant?.compareAtPrice : product.compareAtPrice;
  const stickyLineTotal = (Number(price) || 0) * effectiveQty;
  const stickyCompareLineTotal =
    compareAtForLine != null && Number(compareAtForLine) > 0
      ? Number(compareAtForLine) * effectiveQty
      : null;
  const saveLineCents =
    compareAtForLine != null && Number(compareAtForLine) > Number(price || 0)
      ? Number(compareAtForLine) - Number(price || 0)
      : null;
  const pctOff =
    saveLineCents != null && Number(compareAtForLine) > 0
      ? Math.round((saveLineCents / Number(compareAtForLine)) * 100)
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
    const added = addItemIfNew(line);
    openCart();
    if (added) trackAddToCart(product, line.price / 100, effectiveQty, currency);
  }

  /** Loader + retry; waits for live PDP data (ref) so checkout still runs after loading settles. */
  async function handleOrderNowNavigate() {
    if (orderNowNavBusyRef.current) return;
    orderNowNavBusyRef.current = true;
    setOrderNowNavigating(true);
    const maxNavAttempts = 3;
    const navTimeoutMs = 15000;
    const readyDeadlineMs = 25000;
    const readyStarted = Date.now();
    try {
      while (Date.now() - readyStarted < readyDeadlineMs) {
        const ctx = orderNowLiveRef.current;
        if (!ctx.productLoading && buildOrderNowLineFromCtx(ctx)) break;
        await new Promise((r) => setTimeout(r, 80));
      }
      for (let attempt = 0; attempt < maxNavAttempts; attempt++) {
        const ctx = orderNowLiveRef.current;
        const line = buildOrderNowLineFromCtx(ctx);
        const p = ctx.product;
        if (line && p) {
          const added = addItemIfNew(line);
          if (added) trackAddToCart(p, line.price / 100, line.qty, ctx.currency);
        }
        try {
          const navP = router.push('/checkout');
          if (navP && typeof navP.then === 'function') {
            await Promise.race([
              navP,
              new Promise((_, reject) => {
                setTimeout(() => reject(new Error('nav-timeout')), navTimeoutMs);
              }),
            ]);
            if (typeof window !== 'undefined' && !/^\/checkout(\/|$)/.test(window.location.pathname)) {
              window.location.assign('/checkout');
            }
          } else if (typeof window !== 'undefined') {
            window.location.assign('/checkout');
          }
          return;
        } catch {
          if (attempt === maxNavAttempts - 1) {
            if (typeof window !== 'undefined') window.location.assign('/checkout');
            return;
          }
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    } finally {
      orderNowNavBusyRef.current = false;
      setOrderNowNavigating(false);
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
      const { compressReviewMediaFile } = await import('@/lib/compressReviewMedia');
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
      className={`mx-auto max-w-7xl px-3 sm:px-5 lg:px-8 xl:px-10 py-3 sm:py-6 lg:py-8 ${product.inventory !== 0 ? 'pb-28' : ''}`}
    >
      <div className="flex flex-col">
      <div className="order-1 w-full max-w-xl sm:max-w-2xl lg:max-w-2xl mx-auto animate-slide-up">
        <div className="relative w-full">
          <div className="rounded-xl overflow-hidden bg-neutral-50 border border-neutral-200 p-2.5 sm:p-3 flex items-center justify-center">
          <div
            className="relative aspect-square w-full overflow-hidden rounded-[1.1rem] border border-white/90 bg-neutral-50 shadow-lift ring-1 ring-neutral-900/[0.04] sm:rounded-xl frame-media-inset"
            onMouseEnter={() => setZoom(true)}
            onMouseLeave={() => setZoom(false)}
          >
            {product.badge ? (
              <span className="absolute top-3 left-3 z-20 rounded-full border border-neutral-900/12 bg-accent-cream px-3 py-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.06em] text-neutral-900 shadow-sm">
                {product.badge}
              </span>
            ) : null}
            {pctOff != null && pctOff > 0 ? (
              <span className="absolute top-3 right-12 z-20 rounded-full border border-neutral-900/12 bg-accent-cream px-2 py-1 text-[10px] sm:text-[11px] font-bold text-neutral-900 shadow-sm">
                {pctOff}% OFF
              </span>
            ) : null}
            <div
              className={`absolute inset-0 transition-transform duration-150 [transform-origin:center] ${
                zoom ? 'scale-110' : ''
              }`}
            >
              {serverHeroValid ? (
                serverHeroImage
              ) : (
                <Image
                  src={mainImage}
                  alt={productDisplayName}
                  fill
                  className="object-contain"
                  sizes={PRODUCT_HERO_IMAGE_SIZES}
                  priority={clientHeroNeedsPriority}
                  fetchPriority="high"
                  quality={PRODUCT_HERO_IMAGE_QUALITY}
                  decoding="async"
                  loading="eager"
                />
              )}
            </div>
            <button
              type="button"
              onClick={handleWishlistToggle}
              className="absolute top-3 right-3 z-30 p-2.5 rounded-full bg-white/95 shadow-sm border border-neutral-200/80 hover:border-neutral-400 transition backdrop-blur-sm"
              aria-label="Wishlist"
            >
              <svg className="w-5 h-5 text-neutral-700" fill={wishlist.includes(product.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
            </button>
          </div>
          </div>
          <div className="mt-1.5 sm:mt-3 flex gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 sm:pb-1">
            {variantImageList.map((url, i) => {
              const resolved = resolveImageUrl(url);
              return resolved ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImageIndex(i)}
                  className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 sm:h-[4.5rem] sm:w-[4.5rem] sm:rounded-xl ${selectedImageIndex === i ? 'border-neutral-900 ring-2 ring-neutral-200' : 'border-neutral-200'}`}
                >
                  <Image
                    src={resolved}
                    alt={`${productDisplayName} ${i + 1}`}
                    width={80}
                    height={80}
                    className="h-full w-full object-contain"
                    sizes="(max-width: 639px) 56px, 72px"
                    quality={65}
                    loading="eager"
                    fetchPriority="low"
                  />
                </button>
              ) : null;
            })}
          </div>
        </div>
      </div>

      <div className="order-2 w-full max-w-xl sm:max-w-2xl lg:max-w-2xl mx-auto px-3 pb-1 pt-4 sm:px-1 sm:pb-2 sm:pt-6">
        <article
          className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-premium ring-1 ring-neutral-900/[0.035] sm:rounded-[1.75rem]"
          aria-label="Product details and purchase"
        >
          <header className="px-5 pb-5 pt-7 sm:px-7 sm:pb-6 sm:pt-8">
            <h1 className="font-display text-[1.75rem] font-semibold leading-[1.06] tracking-tight text-neutral-900 sm:text-[2rem]">
              {productDisplayName}
            </h1>
            {(product.badge || product.badgeSub) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {product.badge ? (
                  <span className="rounded-full border border-neutral-900/10 bg-accent-cream px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-900">
                    {product.badge}
                  </span>
                ) : null}
                {product.badgeSub ? (
                  <span className="max-w-full rounded-full border border-neutral-200/90 bg-white px-3 py-1.5 text-[11px] font-medium leading-snug text-neutral-700">
                    {product.badgeSub}
                  </span>
                ) : null}
              </div>
            )}
          </header>

          <div className="border-t border-neutral-100 bg-gradient-to-b from-neutral-50/90 to-neutral-50/40 px-5 py-4 sm:px-7 sm:py-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-[1.875rem] font-bold tabular-nums tracking-tight text-neutral-900 sm:text-[2.125rem]">
                {formatPrice(price, currency)}
              </span>
              {compareAtForLine != null && Number(compareAtForLine) > Number(price) ? (
                <>
                  <span className="text-[15px] text-neutral-400 line-through tabular-nums">{formatPrice(compareAtForLine, currency)}</span>
                  {saveLineCents != null && saveLineCents > 0 ? (
                    <span className="rounded-full border border-neutral-900/10 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-900 shadow-sm">
                      Save {formatPrice(saveLineCents, currency)}
                    </span>
                  ) : null}
                </>
              ) : null}
            </div>
            {pctOff != null && pctOff > 0 ? (
              <p className="mt-3 flex items-center gap-2.5 rounded-xl border border-neutral-200/70 bg-white/90 px-3.5 py-2.5 text-[12px] font-semibold text-neutral-900 shadow-sm">
                <span className="h-2 w-2 shrink-0 rounded-full bg-brand-gold" aria-hidden />
                <span>Limited time — sale ends soon</span>
              </p>
            ) : null}
            {product.inventory !== 0 ? (
              <div className="mt-4">
                <ProductTrustBar product={product} variant="pills" />
              </div>
            ) : null}
          </div>

          {introParagraphs.length > 0 ? (
            <div className="space-y-3 border-t border-neutral-100 px-5 py-5 text-[15px] leading-relaxed text-neutral-600 sm:px-7 sm:py-6 sm:text-[0.9375rem] sm:leading-[1.65]">
              {introParagraphs.map((p, i) => (
                <p key={i}>{scrubMedicalTerms(p)}</p>
              ))}
            </div>
          ) : null}
          {Array.isArray(product.benefits) && product.benefits.length > 0 ? (
            <div className="border-t border-neutral-100 px-5 py-5 sm:px-7 sm:py-6">
              <div className="rounded-xl border border-neutral-800/90 bg-gradient-to-b from-neutral-900 to-neutral-950 px-4 py-4 shadow-inner sm:px-5 sm:py-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Key ingredients</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.benefits.slice(0, 8).map((b, i) => {
                    const s = String(b);
                    return (
                      <span
                        key={i}
                        className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] font-medium leading-snug text-neutral-100 backdrop-blur-sm"
                      >
                        {s.length > 44 ? `${s.slice(0, 44)}…` : s}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {product.inventory === 0 ? (
            <div className="border-t border-neutral-100 px-5 py-8 text-center sm:px-7">
              <span className="inline-block rounded-xl border border-neutral-200 bg-neutral-50 px-6 py-3 text-sm font-medium text-neutral-600">
                Out of stock
              </span>
            </div>
          ) : (
            <div className="border-t border-neutral-100 bg-gradient-to-b from-neutral-50/50 via-white to-white px-5 py-6 sm:px-7 sm:py-8">
              {showVariantPicker ? (
                <div>
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Size / variant</p>
                    <ProductRatingSummary
                      product={product}
                      starClassName="text-[1rem] leading-none text-amber-500 sm:text-[1.0625rem]"
                      countClassName="text-[11px] text-neutral-500 sm:text-[12px]"
                      className="flex flex-wrap items-center justify-end gap-x-1 gap-y-0.5"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {product.variants.map((v) => {
                      const selected = variant?.id === v.id;
                      const isBest = bestValueVariantId === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariant(v)}
                          className={`flex min-h-[5.5rem] w-full flex-col items-center justify-center rounded-xl border px-3 py-3 text-center transition duration-200 ${
                            selected
                              ? 'variant-pdp-selected border-transparent shadow-md ring-1 ring-black/[0.06]'
                              : 'border-neutral-200/90 bg-white hover:border-neutral-300 hover:shadow-sm'
                          }`}
                        >
                          <span className={`text-[15px] font-semibold leading-tight ${selected ? 'text-neutral-900' : 'text-neutral-900'}`}>
                            {v.name}
                          </span>
                          <span
                            className={`mt-1 text-[13px] tabular-nums ${selected ? 'text-neutral-800' : 'text-neutral-600'}`}
                          >
                            {formatPrice(v.price, currency)}
                          </span>
                          <span
                            className={`mt-auto block min-h-[1.125rem] pt-2 text-[10px] font-bold uppercase tracking-[0.1em] ${isBest ? 'text-neutral-700' : 'text-transparent'}`}
                            aria-hidden={!isBest}
                          >
                            {isBest ? 'Best value' : '\u00a0'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <div className={showVariantPicker ? 'mt-7 border-t border-neutral-100/80 pt-7' : ''}>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Quantity</p>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="inline-flex items-stretch overflow-hidden rounded-xl border border-neutral-200/90 bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => setQty((n) => Math.max(1, (n || 1) - 1))}
                      className="flex h-11 w-11 items-center justify-center text-lg font-semibold text-neutral-600 transition hover:bg-neutral-50"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <input
                      id={`product-qty-mobile-${formFieldSuffix}`}
                      name="quantityMobile"
                      type="number"
                      min={1}
                      max={99}
                      value={effectiveQty}
                      onChange={(e) => setQty(Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1)))}
                      className="h-11 w-12 border-x border-neutral-100 bg-transparent text-center text-[15px] font-semibold tabular-nums text-neutral-900 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQty((n) => Math.min(99, (n || 1) + 1))}
                      className="flex h-11 w-11 items-center justify-center text-lg font-semibold text-neutral-600 transition hover:bg-neutral-50"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <span className="max-w-[12rem] text-[12px] leading-snug text-neutral-500">Typical use: 2–3 months per bottle</span>
                </div>
              </div>

              <div className="mt-8 space-y-3 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5">
                <button
                  type="button"
                  disabled={orderNowNavigating}
                  aria-busy={orderNowNavigating}
                  onClick={() => {
                    if (orderNowNavigating) return;
                    setOrderNowVibrate(true);
                    setTimeout(() => setOrderNowVibrate(false), 400);
                    void handleOrderNowNavigate();
                  }}
                  className={`btn-pdp-order-now relative z-0 flex min-h-[3.5rem] w-full items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold tracking-tight transition hover:shadow-lg disabled:opacity-90 disabled:pointer-events-none ${
                    orderNowVibrate && !orderNowNavigating ? 'animate-vibrate' : ''
                  }`}
                >
                  {orderNowNavigating ? (
                    <>
                      <Spinner className="relative z-10 h-4 w-4 border-neutral-900/25 border-t-neutral-900" />
                      <span className="relative z-10 text-[14px]">Please wait…</span>
                    </>
                  ) : (
                    <>
                      <svg className="relative z-10 h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"
                        />
                      </svg>
                      <span className="relative z-10">Order now — cash on delivery</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={orderNowNavigating}
                  onClick={() => {
                    if (orderNowNavigating) return;
                    handleAddToCart();
                    setAddCartVibrate(true);
                    setTimeout(() => setAddCartVibrate(false), 400);
                  }}
                  className={`flex min-h-[3rem] w-full items-center justify-center rounded-xl border border-neutral-300 bg-white py-3 text-[14px] font-semibold tracking-tight text-neutral-900 transition hover:border-neutral-400 hover:bg-neutral-50 disabled:opacity-50 disabled:pointer-events-none ${
                    addCartVibrate ? 'animate-vibrate' : 'animate-cta-attract hover:animate-none'
                  }`}
                >
                  Add to cart
                </button>
                <div className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200/60 bg-accent-cream/90 px-3 py-2.5 text-center text-[11px] font-semibold leading-snug text-neutral-900 sm:text-xs">
                  <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-brand-gold" aria-hidden />
                  Limited stock — reserve yours today
                </div>
                <p className="text-center text-[10px] font-medium uppercase tracking-wider text-neutral-500 sm:text-[11px] sm:normal-case sm:tracking-normal">
                  Free shipping · 3–7 day delivery · 7-day returns
                </p>
              </div>
            </div>
          )}
        </article>
      </div>

      {/* Write review + recent reviews */}
      <section className="order-3 mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-neutral-200 w-full max-w-xl sm:max-w-2xl lg:max-w-2xl mx-auto px-3 sm:px-0">
        <div className="mb-5">
          <h3 className="text-[1.25rem] font-semibold text-neutral-900 tracking-tight leading-snug">What customers say</h3>
          <div className="mt-3.5 flex items-center gap-3.5 rounded-2xl border border-neutral-200 bg-white px-4 py-4">
            <span className="font-semibold text-[2.125rem] tabular-nums leading-none tracking-tight text-neutral-900">
              {Number(product.rating || 0).toFixed(1)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-neutral-800 text-[1.125rem] tracking-[0.2em]">{'★'.repeat(Math.min(5, Math.round(Number(product.rating) || 0)))}</div>
              <p className="text-[12px] text-neutral-600 mt-1 leading-snug">
                Based on {product.reviewCount ?? 0} verified reviews
              </p>
            </div>
          </div>
        </div>
        {liveReviewsList.length > 0 ? (
          <div className="mb-6 sm:mb-8 lg:mb-10">
            <h4 className="text-[15px] sm:text-base font-semibold tracking-tight text-neutral-900 mb-3 sm:mb-4">Customer stories</h4>
            <div className="grid grid-cols-1 gap-4 sm:gap-5">
              {liveReviewsList.map((r) => (
                <article
                  key={r.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4 sm:rounded-2xl sm:p-4"
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
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[13px] font-bold text-white">
                        {reviewerInitials(r.authorName)}
                      </span>
                      <span className="truncate text-[15px] font-semibold text-neutral-900">{r.authorName}</span>
                    </div>
                    <span className="shrink-0 text-amber-500 text-[15px] tracking-wide">
                      {'★'.repeat(Math.min(5, r.rating || 0))}
                      <span className="text-neutral-300">{'★'.repeat(5 - Math.min(5, r.rating || 0))}</span>
                    </span>
                  </div>
                  <p className="text-[15px] leading-[1.6] text-neutral-700">
                    {scrubMedicalTerms(r.body)}
                  </p>
                  <span className="mt-2.5 inline-block rounded-full border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-700">
                    ✓ Verified story
                  </span>
                </article>
              ))}
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <div>
            <p className="text-[13px] sm:text-sm lg:text-base text-neutral-600 mb-2 sm:mb-3 lg:mb-4 leading-relaxed lg:leading-relaxed">Share your experience with this product.</p>
            <form onSubmit={handleSubmitReview} className="space-y-2 sm:space-y-3 lg:space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-4">
                <div className="flex-1">
                  <label
                    htmlFor={`product-review-name-${formFieldSuffix}`}
                    className="block text-[11px] sm:text-xs lg:text-sm font-medium text-neutral-600 mb-0.5 sm:mb-1 lg:mb-1.5"
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
                    className="w-full rounded-lg sm:rounded-xl border border-neutral-300 sm:border-2 sm:border-neutral-300 px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5 text-[13px] sm:text-sm lg:text-base text-neutral-900"
                  />
                </div>
                <div className="w-full sm:w-40 lg:w-44">
                  <label
                    htmlFor={`product-review-rating-${formFieldSuffix}`}
                    className="block text-[11px] sm:text-xs lg:text-sm font-medium text-neutral-600 mb-0.5 sm:mb-1 lg:mb-1.5"
                  >
                    Rating
                  </label>
                  <select
                    id={`product-review-rating-${formFieldSuffix}`}
                    name="rating"
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value) || 5)}
                    className="w-full rounded-lg sm:rounded-xl border border-neutral-300 sm:border-2 sm:border-neutral-300 px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5 text-[13px] sm:text-sm lg:text-base text-neutral-900"
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
                className="block text-[11px] sm:text-xs lg:text-sm font-medium text-neutral-600 mb-0.5 sm:mb-1 lg:mb-1.5"
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
                className="w-full rounded-lg sm:rounded-xl border border-neutral-300 sm:border-2 sm:border-neutral-300 px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-3 text-[13px] sm:text-sm lg:text-base text-neutral-900 min-h-[5.5rem] sm:min-h-0 lg:min-h-[7rem]"
              />
            </div>
            <div className="mt-2 sm:mt-3">
              <label
                htmlFor={`product-review-media-${formFieldSuffix}`}
                className="block text-[11px] sm:text-xs lg:text-sm font-medium text-neutral-600 mb-1"
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
              aria-busy={reviewSubmitting}
              className="btn-gold-primary mt-2 sm:mt-3 lg:mt-4 inline-flex items-center justify-center gap-2 rounded-full sm:rounded-2xl px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 text-[13px] sm:text-sm lg:text-base disabled:opacity-60 hover:shadow-lg"
            >
              {reviewSubmitting ? (
                <span aria-hidden>
                  <Spinner className="h-3.5 w-3.5 sm:h-4 sm:w-4 border-white/35 border-t-white" />
                </span>
              ) : null}
              {reviewSubmitting ? 'Submitting…' : 'Submit review'}
            </button>
            </form>
          </div>
          <div>
            {primaryReviews && primaryReviews.length > 0 ? (
              <div className="space-y-3 sm:space-y-4 lg:space-y-5">
                <p className="text-[13px] sm:text-sm lg:text-base font-semibold tracking-tight text-neutral-800">
                  Recent reviews{fiveStarReviews.length > 0 ? ' (5-star highlights)' : ''}
                </p>
                {visibleReviews.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-neutral-200 bg-white p-4 sm:rounded-xl sm:p-4 lg:border-neutral-100 lg:bg-neutral-50 lg:p-5"
                  >
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
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[13px] font-bold text-white">
                          {reviewerInitials(r.authorName)}
                        </span>
                        <span className="truncate text-[15px] font-semibold text-neutral-900">{r.authorName}</span>
                      </div>
                      <span className="shrink-0 text-amber-500 text-[15px]">
                        {'★'.repeat(Math.min(5, r.rating || 0))}
                        <span className="text-neutral-300">{'★'.repeat(5 - Math.min(5, r.rating || 0))}</span>
                      </span>
                    </div>
                    <p className="text-[15px] leading-[1.6] text-neutral-700">
                      {scrubMedicalTerms(r.body)}
                    </p>
                    <span className="mt-2 inline-block rounded-full border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-700">
                      ✓ Verified purchase
                    </span>
                  </div>
                ))}
                {primaryReviews.length > reviewPreviewCount && (
                  <button
                    type="button"
                    onClick={() => setReviewsExpanded((v) => !v)}
                    className="text-[13px] sm:text-sm lg:text-base font-semibold text-neutral-900 hover:text-neutral-700 border-b border-neutral-300 pb-0.5"
                  >
                    {reviewsExpanded
                      ? 'View less'
                      : `View more reviews (${primaryReviews.length - reviewPreviewCount} more)`}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-[13px] sm:text-sm lg:text-base text-neutral-600 leading-relaxed lg:leading-relaxed">
                {liveReviewsList.length > 0
                  ? 'No community reviews yet. Be the first to leave one.'
                  : 'No reviews yet. Be the first to review this product.'}
              </p>
            )}
          </div>
        </div>
      </section>

      {keyBenefitCards.length > 0 ? (
        <section className="order-4 border-t border-neutral-200 px-3 sm:px-4 py-7 max-w-xl sm:max-w-2xl lg:max-w-2xl mx-auto bg-page-canvas">
          <h3 className="text-[1.25rem] font-semibold tracking-tight text-neutral-900 leading-snug">Why {productDisplayName} works</h3>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {keyBenefitCards.slice(0, 6).map((row, i) => (
              <div key={i} className="rounded-xl border border-neutral-200 bg-white p-3.5">
                <span className="mb-1.5 block text-xl" aria-hidden>
                  {row.icon}
                </span>
                <p className="text-[14px] font-semibold leading-snug text-neutral-900">{row.title}</p>
                {row.desc ? <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-600">{row.desc}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {howToSteps.length > 0 ? (
        <section className="order-4 border-t border-neutral-200/80 px-3 sm:px-4 py-7 max-w-xl sm:max-w-2xl lg:max-w-2xl mx-auto">
          <h3 className="text-[1.25rem] font-semibold tracking-tight text-neutral-900 leading-snug">How to use</h3>
          <ul className="mt-5 list-none space-y-4">
            {howToSteps.map((step, i) => (
              <li key={i} className="flex gap-3.5">
                <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[13px] font-semibold text-white">
                  {i + 1}
                </span>
                <p className="pt-0.5 text-[15px] leading-[1.6] text-neutral-700">{scrubMedicalTerms(step)}</p>
              </li>
            ))}
          </ul>
          {proTipHtml ? (
            <div
              className="mt-5 border-l-4 border-brand-gold bg-accent-cream px-4 py-3.5 text-[14px] leading-relaxed text-neutral-800 [&_strong]:font-semibold [&_strong]:text-neutral-900"
              dangerouslySetInnerHTML={{ __html: proTipHtml }}
            />
          ) : null}
        </section>
      ) : null}

      {(product.faq || []).length > 0 ? (
        <section className="order-4 border-t border-neutral-200/80 px-3 sm:px-4 py-7 max-w-xl sm:max-w-2xl lg:max-w-2xl mx-auto">
          <h3 className="text-[1.25rem] font-semibold tracking-tight text-neutral-900 leading-snug">Frequently asked questions</h3>
          <div className="mt-5 space-y-2.5">
            {(product.faq || []).map((item, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-[15px] font-semibold leading-snug text-neutral-900"
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                >
                  <span className="min-w-0 pr-2">{scrubMedicalTerms(item.q)}</span>
                  <span
                    className={`shrink-0 text-neutral-500 text-lg transition-transform ${faqOpen === i ? 'rotate-180' : ''}`}
                    aria-hidden
                  >
                    ▾
                  </span>
                </button>
                {faqOpen === i ? (
                  <div className="border-t border-neutral-100 px-4 py-3.5 text-[14px] leading-relaxed text-neutral-600">
                    {scrubMedicalTerms(item.a)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="order-4 border-t border-neutral-200 bg-accent-cream/90 px-3 sm:px-4 py-6 text-[12px] leading-relaxed text-neutral-700 max-w-xl sm:max-w-2xl lg:max-w-2xl mx-auto">
        {disclaimerEnabled ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-900">{disclaimerTitleToShow}</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              {disclaimerItemsToShow.map((item, idx) => (
                <li key={`mob-disc-${idx}`}>{item}</li>
              ))}
            </ul>
          </>
        ) : (
          <p>
            <strong>Disclaimer:</strong> Cosmetic body care for external use only. Not a drug. Results may vary.
          </p>
        )}
      </div>

      {/* Full description + policies (below structured sections) */}
      <section className="order-6 mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-neutral-200 w-full max-w-xl sm:max-w-2xl lg:max-w-2xl mx-auto px-3 sm:px-4">
        {product.description && (
          <details className="group mb-5 rounded-xl border-2 border-neutral-200 bg-white px-4 py-4 sm:px-5 sm:py-4 open:border-neutral-400">
            <summary className="cursor-pointer text-[15px] font-semibold text-neutral-900 list-none [&::-webkit-details-marker]:hidden">
              Full product information <span className="text-neutral-500 font-normal group-open:hidden">+</span>
              <span className="hidden text-neutral-500 font-normal group-open:inline">−</span>
            </summary>
            <div
              className="mt-3.5 text-[14px] leading-relaxed text-neutral-600 product-description max-h-[70vh] overflow-y-auto [&_li]:text-[14px] [&_p]:text-[14px]"
              dangerouslySetInnerHTML={{ __html: sanitizedProductDescriptionHtml }}
            />
          </details>
        )}
        <div className="rounded-xl sm:rounded-2xl border border-neutral-200 bg-neutral-50/60 px-4 py-4 sm:px-5 sm:py-4 text-[13px] sm:text-sm text-neutral-600 space-y-2 leading-relaxed">
          <p><strong className="font-semibold text-neutral-800">Shipping:</strong> {SHIPPING_POLICY}</p>
          <p><strong className="font-semibold text-neutral-800">Returns:</strong> {RETURN_POLICY}</p>
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

      </div>


      {related.length > 0 && (
        <section className="mt-6 sm:mt-12 lg:mt-20 xl:mt-24 pt-6 sm:pt-10 lg:pt-16 xl:pt-20 border-t border-neutral-200">
          <h2 className="text-[1.125rem] sm:text-xl lg:text-2xl xl:text-[1.75rem] font-semibold text-neutral-900 mb-3 sm:mb-6 lg:mb-8 xl:mb-10 tracking-tight max-lg:leading-snug inline-flex flex-col gap-1">
            <span className="h-px w-10 bg-neutral-900/20" aria-hidden />
            <span>You may also like</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 xl:gap-8">
            {related.map((p, i) => {
              const img = resolveImageUrl(p.images?.[0]) || '/assets/nature-secret-logo.svg';
              const name = p.name ?? p.slug ?? 'Product';
              return (
                <Link key={p.id} href={`/shop/${productPath(p)}`} className="group animate-stagger-in opacity-0" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="aspect-square rounded-xl sm:rounded-2xl lg:rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200/90 transition-all group-hover:border-neutral-400 group-hover:shadow-premium">
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
                  <p className="mt-2 sm:mt-3 lg:mt-4 text-[13px] sm:text-sm lg:text-base font-semibold text-neutral-900 line-clamp-2 leading-snug max-lg:tracking-tight">{name}</p>
                  <p className="text-[12px] sm:text-sm lg:text-base text-neutral-600 tabular-nums mt-0.5 lg:mt-1">{formatPrice(p.price, currency)}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Mobile: sticky bar — price + Order Now (sample layout; variant/qty live in page) */}
      {product.inventory !== 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200/70 bg-page-canvas/95 backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.06)] px-4 py-3.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          role="region"
          aria-label="Quick purchase"
        >
          <div className="mx-auto max-w-7xl flex items-center gap-3">
            <div className="min-w-0 shrink-0">
              <p className="text-xl font-semibold tabular-nums tracking-tight leading-tight text-neutral-900">{formatPrice(stickyLineTotal, currency)}</p>
              {stickyCompareLineTotal != null &&
                stickyCompareLineTotal > stickyLineTotal &&
                Number.isFinite(stickyCompareLineTotal) && (
                  <p className="text-[11px] text-neutral-500 line-through tabular-nums">{formatPrice(stickyCompareLineTotal, currency)}</p>
                )}
            </div>
            <button
              type="button"
              disabled={orderNowNavigating}
              aria-busy={orderNowNavigating}
              onClick={() => {
                if (orderNowNavigating) return;
                setOrderNowVibrate(true);
                setTimeout(() => setOrderNowVibrate(false), 400);
                void handleOrderNowNavigate();
              }}
              className={`btn-pdp-order-now relative z-0 min-h-[3.25rem] flex-1 rounded-full px-3 text-[14px] font-semibold tracking-tight transition hover:shadow-lg disabled:opacity-90 disabled:pointer-events-none ${
                orderNowVibrate && !orderNowNavigating ? 'animate-vibrate' : ''
              }`}
            >
              {orderNowNavigating ? (
                <span className="relative z-10 inline-flex items-center justify-center gap-2 text-[13px]">
                  <Spinner className="h-4 w-4 border-neutral-900/25 border-t-neutral-900" />
                  Please wait…
                </span>
              ) : (
                <span className="relative z-10">Order Now — COD</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
