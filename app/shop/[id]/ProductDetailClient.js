'use client';

import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
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
import { compressReviewMediaFile } from '@/lib/compressReviewMedia';
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

function ProductRatingSummary({ product, starClassName = '', countClassName = '', className = 'flex flex-wrap items-center justify-end gap-x-1' }) {
  const r = Math.min(5, Math.round(Number(product?.rating) || 0));
  return (
    <div className={className}>
      <span className={`text-gold-600 ${starClassName}`}>{'★'.repeat(r)}</span>
      <span className={`text-neutral-300 ${starClassName}`}>{'★'.repeat(5 - r)}</span>
      <span className={`text-neutral-500 ${countClassName}`}>({product?.reviewCount ?? 0} reviews)</span>
    </div>
  );
}

function ProductTrustBar({ product, className = '', variant = 'text' }) {
  const n = product?.reviewCount != null && product.reviewCount > 0 ? product.reviewCount : 37;
  const labels = ['Cash on Delivery', 'Free Shipping', `${n} Verified Reviews`];
  if (variant === 'pills') {
    return (
      <div className={`flex flex-wrap gap-1.5 ${className}`} role="group" aria-label="Trust highlights">
        {labels.map((label) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold-200 bg-gold-50 px-3 py-1.5 text-[11px] font-medium tracking-wide text-neutral-800"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden />
            {label}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs text-neutral-600 ${className}`}
      role="group"
      aria-label="Trust highlights"
    >
      <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
        <span aria-hidden>✅</span> Cash on Delivery
      </span>
      <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
        <span aria-hidden>✅</span> Free Shipping
      </span>
      <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
        <span aria-hidden>✅</span> {n} Verified Reviews
      </span>
    </div>
  );
}

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
  const galleryResolvedUrls = useMemo(() => {
    const list = (variant?.images && variant.images.length) ? variant.images : (variant?.image ? [variant.image] : product?.images || []);
    return list.map((u) => resolveImageUrl(u)).filter(Boolean);
  }, [product?.id, variant?.id, variant?.images, variant?.image, product?.images]);
  useEffect(() => {
    if (typeof window === 'undefined' || !galleryResolvedUrls.length) return;
    const unique = [...new Set(galleryResolvedUrls)];
    const links = [];
    for (const href of unique) {
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
      } ${product.inventory !== 0 ? 'max-lg:pb-28' : ''}`}
    >
      <div className="flex flex-col">
      <div className="order-1 grid grid-cols-1 lg:grid-cols-2 lg:gap-x-14 xl:gap-x-20 max-lg:gap-y-3 sm:max-lg:gap-y-4 animate-slide-up items-start">
        {/* Left: gallery (desktop = large column; mobile unchanged) */}
        <div className="relative w-full lg:max-w-xl xl:max-w-md lg:mx-0 mx-auto">
          <div className="max-lg:rounded-xl max-lg:overflow-hidden max-lg:bg-gold-50/40 max-lg:border max-lg:border-gold-100 max-lg:p-2.5 sm:max-lg:p-3 max-lg:flex max-lg:items-center max-lg:justify-center lg:contents">
          <div
            className="aspect-square w-full rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden bg-white relative border border-neutral-200 shadow-sm lg:shadow-premium lg:border-0 lg:ring-1 lg:ring-neutral-200/60"
            onMouseEnter={() => setZoom(true)}
            onMouseLeave={() => setZoom(false)}
          >
            {product.badge ? (
              <span className="absolute top-3 left-3 z-20 rounded-full bg-gold-500 px-2.5 py-1 max-lg:px-3 max-lg:py-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.06em] text-white shadow-gold-sm">
                {product.badge}
              </span>
            ) : null}
            {pctOff != null && pctOff > 0 ? (
              <span className="absolute top-3 right-12 z-20 rounded-full bg-red-700 px-2 py-1 text-[10px] sm:text-[11px] font-bold text-white lg:right-3">
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
              className="absolute top-3 right-3 z-30 p-2.5 rounded-full bg-white shadow-sm border border-neutral-200 hover:border-gold-300 transition"
              aria-label="Wishlist"
            >
              <svg className="w-5 h-5 text-neutral-700" fill={wishlist.includes(product.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
            </button>
          </div>
          </div>
          <div className="mt-1.5 sm:mt-3 lg:mt-5 flex gap-1.5 sm:gap-2 lg:gap-3 overflow-x-auto pb-0.5 sm:pb-1 lg:pb-0">
            {variantImageList.map((url, i) => {
              const resolved = resolveImageUrl(url);
              return resolved ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImageIndex(i)}
                  className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 sm:h-20 sm:w-20 lg:h-[4.75rem] lg:w-[4.75rem] sm:rounded-xl ${selectedImageIndex === i ? 'border-neutral-900 lg:border-neutral-900 lg:ring-2 lg:ring-neutral-300' : 'border-neutral-200'}`}
                >
                  <Image
                    src={resolved}
                    alt={`${productDisplayName} ${i + 1}`}
                    width={80}
                    height={80}
                    className="h-full w-full object-contain"
                    sizes="(max-width: 639px) 56px, (max-width: 1023px) 80px, 76px"
                    quality={65}
                    loading="eager"
                    fetchPriority="low"
                  />
                </button>
              ) : null;
            })}
          </div>
        </div>

        <div className="min-w-0 space-y-2 sm:space-y-3 lg:space-y-5 xl:space-y-6">
          {/* Desktop: purchase column (scrolls with page; disclaimer lives below FAQ in main column) */}
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
            <p className="text-2xl xl:text-[1.75rem] font-semibold text-neutral-900 pt-1 tabular-nums">
              {(product.variants?.length > 1 ? variant?.compareAtPrice : product.compareAtPrice) && (
                <span className="text-neutral-500 line-through mr-2 text-lg xl:text-xl">{formatPrice(product.variants?.length > 1 ? variant?.compareAtPrice : product.compareAtPrice, currency)}</span>
              )}
              {formatPrice(price, currency)}
            </p>
            {product.inventory !== 0 ? <ProductTrustBar product={product} className="pt-1" /> : null}
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
            <div className="pt-1 lg:pt-2">
              <div className="flex flex-wrap items-start justify-between gap-3 xl:gap-4">
                {product.variants?.length > 1 ? (
                  <div className="min-w-0 flex-1 overflow-visible">
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Size / Variant</p>
                    <div className="flex flex-wrap gap-2 lg:gap-2.5 pt-1">
                      {product.variants.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariant(v)}
                          className={`relative rounded-full sm:rounded-2xl border-2 px-4 py-2 text-sm font-medium transition ${
                            variant?.id === v.id ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm' : 'border-neutral-200 text-neutral-700 hover:border-neutral-300 bg-white'
                          }`}
                        >
                          {bestValueVariantId === v.id ? (
                            <span className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-gold-sm">
                              Best value
                            </span>
                          ) : null}
                          {v.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1" aria-hidden />
                )}
                <div className="shrink-0 pt-0.5 text-right lg:max-w-[11rem] xl:max-w-none">
                  <ProductRatingSummary
                    product={product}
                    starClassName="text-lg xl:text-xl leading-none"
                    countClassName="text-sm mt-1 sm:mt-0 sm:ml-1"
                    className="flex flex-col items-end gap-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-x-1"
                  />
                </div>
              </div>
            </div>
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
                    disabled={orderNowNavigating}
                    aria-busy={orderNowNavigating}
                    onClick={() => {
                      if (orderNowNavigating) return;
                      setOrderNowVibrate(true);
                      setTimeout(() => setOrderNowVibrate(false), 400);
                      void handleOrderNowNavigate();
                    }}
                    className={`checkout-cta-animated cta-shimmer-gold relative z-0 w-full rounded-full sm:rounded-2xl bg-gold-500 py-3 lg:py-3.5 text-sm font-semibold text-neutral-900 hover:bg-gold-600 transition shadow-gold-md disabled:opacity-90 disabled:pointer-events-none ${
                      orderNowVibrate && !orderNowNavigating ? 'animate-vibrate' : ''
                    }`}
                  >
                    <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
                      {orderNowNavigating ? (
                        <span aria-hidden>
                          <Spinner className="h-3.5 w-3.5 border-neutral-900/25 border-t-neutral-900" />
                        </span>
                      ) : null}
                      Order Now
                    </span>
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
                    className={`w-full rounded-full sm:rounded-2xl border-2 border-neutral-800 bg-white py-2 lg:py-2.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-50 transition disabled:opacity-50 disabled:pointer-events-none ${
                      addCartVibrate ? 'animate-vibrate' : 'animate-cta-attract hover:animate-none'
                    }`}
                  >
                    Add to cart
                  </button>
                  <p className="text-center text-[11px] lg:text-xs font-medium text-neutral-700 pt-0.5">
                    🔥 Limited stock — confirm your order today
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Mobile / tablet: out of stock notice (variant & qty live in fixed bottom bar) */}
          <div className="space-y-2 lg:hidden">
            {product.inventory === 0 ? (
              <div className="pt-0 sm:pt-0.5">
                <span className="mt-2 sm:mt-3 block rounded-xl border border-neutral-200/90 bg-neutral-100 py-2.5 sm:py-3 text-center text-[13px] sm:text-sm font-medium text-neutral-600">
                  Out of stock
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile-only: purchase block sequence (title → price → trust → intro → ingredients → variant → qty → CTAs) */}
      <div className="order-2 lg:hidden">
        <div className="space-y-6 border-t border-neutral-200 bg-page-canvas px-3 sm:px-4 pt-6 sm:pt-6 rounded-t-2xl -mt-2 sm:mt-0 sm:rounded-none sm:border-t sm:bg-transparent sm:px-0">
          <div>
            <h1 className="text-[1.8125rem] sm:text-[1.9375rem] font-semibold leading-[1.12] tracking-[-0.025em] text-neutral-900">{productDisplayName}</h1>
            {product.badgeSub ? <p className="mt-2.5 text-[13px] sm:text-sm text-neutral-600 leading-relaxed max-w-prose">{product.badgeSub}</p> : null}
          </div>
          <div className="border-b border-neutral-200 pb-4 sm:border-0 sm:pb-0">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="text-[1.875rem] sm:text-[2.0625rem] font-bold tabular-nums tracking-tight text-neutral-900">{formatPrice(price, currency)}</span>
              {compareAtForLine != null && Number(compareAtForLine) > Number(price) ? (
                <>
                  <span className="text-[15px] text-neutral-500 line-through tabular-nums">{formatPrice(compareAtForLine, currency)}</span>
                  {saveLineCents != null && saveLineCents > 0 ? (
                    <span className="rounded-md border border-gold-400 bg-gold-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gold-900">
                      Save {formatPrice(saveLineCents, currency)}
                    </span>
                  ) : null}
                </>
              ) : null}
            </div>
            {pctOff != null && pctOff > 0 ? (
              <p className="mt-2 flex items-center gap-2 text-[12px] font-semibold text-neutral-800">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden />
                <span>⏱ Limited time offer — sale ends soon</span>
              </p>
            ) : null}
          </div>
          {product.inventory !== 0 ? <ProductTrustBar product={product} variant="pills" /> : null}
          {introParagraphs.length > 0 ? (
            <div className="space-y-3.5 border-b border-neutral-200 pb-5 text-[15px] leading-[1.65] text-neutral-600">
              {introParagraphs.map((p, i) => (
                <p key={i}>{scrubMedicalTerms(p)}</p>
              ))}
            </div>
          ) : null}
          {Array.isArray(product.benefits) && product.benefits.length > 0 ? (
            <div className="-mx-3 rounded-xl bg-neutral-900 px-4 py-4 border border-neutral-800 sm:-mx-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-400">Key ingredients</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.benefits.slice(0, 8).map((b, i) => {
                  const s = String(b);
                  return (
                    <span
                      key={i}
                      className="rounded-full border border-gold-500/40 bg-neutral-800 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-gold-100"
                    >
                      {s.length > 44 ? `${s.slice(0, 44)}…` : s}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}
          {product.inventory === 0 ? (
            <span className="block rounded-xl border border-neutral-200/90 bg-neutral-100 py-3 text-center text-[14px] font-medium text-neutral-600">
              Out of stock
            </span>
          ) : (
            <>
              {product.variants?.length > 1 ? (
                <div className="overflow-visible pt-1">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-700">Choose your size</p>
                  <div className="grid grid-cols-2 gap-3 overflow-visible pt-2">
                    {product.variants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={`relative mt-1 rounded-xl border-2 py-3.5 px-2.5 text-center transition ${
                          variant?.id === v.id
                            ? 'border-gold-500 bg-neutral-900'
                            : 'border-neutral-200 bg-white'
                        }`}
                      >
                        {bestValueVariantId === v.id ? (
                          <span className="pointer-events-none absolute -top-2.5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-gold-sm">
                            Best value
                          </span>
                        ) : null}
                        <span
                          className={`block text-[15px] font-semibold leading-snug ${variant?.id === v.id ? 'text-white' : 'text-neutral-900'}`}
                        >
                          {v.name}
                        </span>
                        <span
                          className={`mt-1 block text-[13px] tabular-nums ${variant?.id === v.id ? 'text-gold-200' : 'text-neutral-600'}`}
                        >
                          {formatPrice(v.price, currency)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div>
                <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-600">Quantity</p>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="inline-flex items-stretch overflow-hidden rounded-full border-2 border-neutral-200 bg-white">
                    <button
                      type="button"
                      onClick={() => setQty((n) => Math.max(1, (n || 1) - 1))}
                      className="flex h-10 w-10 items-center justify-center text-lg font-semibold text-neutral-700 hover:bg-gold-50"
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
                      className="h-10 w-12 border-x border-neutral-200 bg-transparent text-center text-[15px] font-semibold tabular-nums text-neutral-900 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQty((n) => Math.min(99, (n || 1) + 1))}
                      className="flex h-10 w-10 items-center justify-center text-lg font-semibold text-neutral-700 hover:bg-gold-50"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[12px] leading-snug text-neutral-600">2–3 month supply per bottle</span>
                </div>
              </div>
              <div className="flex flex-col gap-3 border-b border-neutral-200/70 pb-6">
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
                  className={`checkout-cta-animated cta-shimmer-gold relative z-0 flex min-h-[3.5rem] w-full items-center justify-center gap-2 rounded-full bg-gold-500 px-4 text-[15px] font-bold tracking-tight text-neutral-900 shadow-gold-md transition hover:bg-gold-600 disabled:opacity-90 disabled:pointer-events-none ${
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
                      <span className="relative z-10">Order Now — Cash on Delivery</span>
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
                  className={`min-h-[3rem] w-full rounded-full border-2 border-neutral-900 bg-white py-3 text-[14px] font-semibold tracking-tight text-neutral-900 transition hover:bg-neutral-50 disabled:opacity-50 disabled:pointer-events-none ${
                    addCartVibrate ? 'animate-vibrate' : 'animate-cta-attract hover:animate-none'
                  }`}
                >
                  Add to Cart
                </button>
                <div className="flex items-center justify-center gap-2 border border-gold-300 bg-gold-50 px-3 py-2.5 text-center text-[12px] font-bold text-neutral-900">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-gold-500" aria-hidden />
                  Limited stock — only a few bottles left
                </div>
                <p className="text-center text-[11px] font-medium tracking-wide leading-relaxed text-neutral-600">
                  📦 Free shipping · Arrives in 3–7 days · Easy 7-day returns
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Write review + recent reviews */}
      <section className="order-3 lg:order-4 mt-4 sm:mt-6 lg:mt-16 xl:mt-20 pt-5 sm:pt-8 lg:pt-14 xl:pt-16 border-t border-neutral-200 max-lg:border-t-0 max-lg:pt-4 sm:max-lg:pt-5">
        <div className="lg:hidden mb-5">
          <h3 className="text-[1.25rem] font-semibold text-neutral-900 tracking-tight leading-snug">What customers say</h3>
          <div className="mt-3.5 flex items-center gap-3.5 rounded-xl border-2 border-gold-200 bg-gold-50 px-4 py-4">
            <span className="font-semibold text-[2.125rem] tabular-nums leading-none tracking-tight text-neutral-900">
              {Number(product.rating || 0).toFixed(1)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-gold-500 text-[1.125rem] tracking-[0.2em]">{'★'.repeat(Math.min(5, Math.round(Number(product.rating) || 0)))}</div>
              <p className="text-[12px] text-neutral-600 mt-1 leading-snug">
                Based on {product.reviewCount ?? 0} verified reviews
              </p>
            </div>
          </div>
        </div>
        <h3 className="hidden lg:block text-base sm:text-lg lg:text-xl font-semibold text-neutral-900 mb-3 sm:mb-4 lg:mb-6 tracking-tight">Reviews</h3>
        {liveReviewsList.length > 0 ? (
          <div className="mb-6 sm:mb-8 lg:mb-10">
            <h4 className="text-[15px] sm:text-base font-semibold tracking-tight text-neutral-900 mb-3 sm:mb-4">Customer stories</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
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
                  <div className="mb-2 flex items-start justify-between gap-2 lg:hidden">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[13px] font-bold text-white">
                        {reviewerInitials(r.authorName)}
                      </span>
                      <span className="truncate text-[15px] font-semibold text-neutral-900">{r.authorName}</span>
                    </div>
                    <span className="shrink-0 text-gold-500 text-[15px] tracking-wide">
                      {'★'.repeat(Math.min(5, r.rating || 0))}
                      <span className="text-neutral-300">{'★'.repeat(5 - Math.min(5, r.rating || 0))}</span>
                    </span>
                  </div>
                  <div className="mb-2 hidden flex-wrap items-center gap-1.5 sm:gap-2 lg:flex">
                    <span className="text-gold-600 text-sm">{'★'.repeat(Math.min(5, r.rating || 0))}</span>
                    <span className="text-neutral-400 text-sm">{'★'.repeat(5 - Math.min(5, r.rating || 0))}</span>
                    <span className="text-xs sm:text-sm font-medium text-neutral-800">{r.authorName}</span>
                  </div>
                  <p className="text-[15px] leading-[1.6] text-neutral-700 lg:text-xs sm:lg:text-sm lg:leading-relaxed lg:text-neutral-600">
                    {scrubMedicalTerms(r.body)}
                  </p>
                  <span className="mt-2.5 inline-block rounded-full border border-gold-200 bg-gold-50 px-2 py-0.5 text-[11px] font-semibold text-gold-900">
                    ✓ Verified story
                  </span>
                </article>
              ))}
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-10 xl:gap-14">
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
              className="mt-2 sm:mt-3 lg:mt-4 inline-flex items-center justify-center gap-2 rounded-full sm:rounded-2xl bg-neutral-900 px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 text-[13px] sm:text-sm lg:text-base font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
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
                    <div className="mb-2 flex items-start justify-between gap-2 lg:hidden">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[13px] font-bold text-white">
                          {reviewerInitials(r.authorName)}
                        </span>
                        <span className="truncate text-[15px] font-semibold text-neutral-900">{r.authorName}</span>
                      </div>
                      <span className="shrink-0 text-gold-500 text-[15px]">
                        {'★'.repeat(Math.min(5, r.rating || 0))}
                        <span className="text-neutral-300">{'★'.repeat(5 - Math.min(5, r.rating || 0))}</span>
                      </span>
                    </div>
                    <div className="mb-1.5 hidden flex-wrap items-center gap-1.5 sm:mb-2 lg:mb-2.5 lg:flex sm:gap-2 lg:gap-2.5">
                      <span className="text-gold-600 text-sm sm:text-base lg:text-lg">{'★'.repeat(Math.min(5, r.rating || 0))}</span>
                      <span className="text-neutral-400 text-sm sm:text-base lg:text-lg">{'★'.repeat(5 - Math.min(5, r.rating || 0))}</span>
                      <span className="text-xs sm:text-sm lg:text-base font-medium text-neutral-700">{r.authorName}</span>
                    </div>
                    <p className="text-[15px] leading-[1.6] text-neutral-700 lg:text-xs sm:lg:text-sm lg:leading-relaxed lg:text-neutral-600">
                      {scrubMedicalTerms(r.body)}
                    </p>
                    <span className="mt-2 inline-block rounded-full border border-gold-200 bg-gold-50 px-2 py-0.5 text-[11px] font-semibold text-gold-900">
                      ✓ Verified purchase
                    </span>
                  </div>
                ))}
                {primaryReviews.length > reviewPreviewCount && (
                  <button
                    type="button"
                    onClick={() => setReviewsExpanded((v) => !v)}
                    className="text-[13px] sm:text-sm lg:text-base font-semibold text-gold-800 hover:text-gold-700 border-b border-gold-500/40 pb-0.5"
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
        <section className="order-4 lg:hidden border-t border-neutral-200 px-1 py-7 sm:px-0 bg-neutral-50">
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
        <section className="order-4 lg:hidden border-t border-neutral-200/80 px-1 py-7 sm:px-0">
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
              className="mt-5 border-l-4 border-gold-500 bg-gold-50 px-4 py-3.5 text-[14px] leading-relaxed text-neutral-700 [&_strong]:font-semibold [&_strong]:text-neutral-900"
              dangerouslySetInnerHTML={{ __html: proTipHtml }}
            />
          ) : null}
        </section>
      ) : null}

      {(product.faq || []).length > 0 ? (
        <section className="order-4 lg:hidden border-t border-neutral-200/80 px-1 py-7 sm:px-0">
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
                    className={`shrink-0 text-gold-600 text-lg transition-transform ${faqOpen === i ? 'rotate-180' : ''}`}
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

      <div className="order-4 border-t border-neutral-200 bg-neutral-50 px-3 py-6 text-[12px] leading-relaxed text-neutral-600 lg:hidden">
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

      {/* Desktop: FAQ + policies only */}
      <section className="order-5 lg:order-2 max-lg:hidden block mt-16 xl:mt-20 pt-12 xl:pt-16 border-t border-neutral-200">
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
        {disclaimerEnabled ? (
          <div
            className={`rounded-xl border border-neutral-200 bg-neutral-50/90 px-3 py-2.5 max-w-2xl xl:max-w-3xl ${
              (product.faq || []).length ? 'mt-8 xl:mt-10' : ''
            }`}
          >
            <p className="text-[11px] xl:text-xs font-semibold text-neutral-900">{disclaimerTitleToShow}</p>
            <ul className="mt-1.5 space-y-1 text-[11px] xl:text-sm text-neutral-700 leading-relaxed list-disc pl-4">
              {disclaimerItemsToShow.map((item, idx) => (
                <li key={`d-${idx}-${item.slice(0, 12)}`}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div
          className={`rounded-2xl bg-neutral-50 border border-neutral-100 p-6 xl:p-8 text-sm xl:text-[15px] text-neutral-600 space-y-3 leading-relaxed max-w-2xl xl:max-w-3xl ${
            (product.faq || []).length || disclaimerEnabled ? 'mt-10 xl:mt-12' : ''
          }`}
        >
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

      {/* Mobile: full description + policies (below structured sections) */}
      <section className="order-6 mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-neutral-200 lg:hidden">
        {product.description && (
          <details className="group mb-5 rounded-xl border-2 border-neutral-200 bg-white px-4 py-4 sm:px-5 sm:py-4 open:border-gold-400">
            <summary className="cursor-pointer text-[15px] font-semibold text-neutral-900 list-none [&::-webkit-details-marker]:hidden">
              Full product information <span className="text-gold-600 font-normal group-open:hidden">+</span>
              <span className="hidden text-gold-600 font-normal group-open:inline">−</span>
            </summary>
            <div
              className="mt-3.5 text-[14px] leading-relaxed text-neutral-600 product-description max-h-[70vh] overflow-y-auto [&_li]:text-[14px] [&_p]:text-[14px]"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(scrubMedicalTerms(product.description)) }}
            />
          </details>
        )}
        <div className="rounded-xl sm:rounded-2xl border border-neutral-200 bg-neutral-100 px-4 py-4 sm:px-5 sm:py-4 text-[13px] sm:text-sm text-neutral-600 space-y-2 leading-relaxed">
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
          <h2 className="text-[1.125rem] sm:text-xl lg:text-2xl xl:text-[1.75rem] font-semibold text-neutral-900 mb-3 sm:mb-6 lg:mb-8 xl:mb-10 tracking-tight max-lg:leading-snug">You may also like</h2>
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
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t-2 border-gold-400 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-4 py-3.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
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
              className={`checkout-cta-animated cta-shimmer-gold relative z-0 min-h-[3.25rem] flex-1 rounded-full bg-gold-500 px-3 text-[14px] font-bold tracking-tight text-neutral-900 shadow-gold-md transition hover:bg-gold-600 disabled:opacity-90 disabled:pointer-events-none ${
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

      {/* Desktop: sticky bottom bar when purchase panel scrolls out */}
      {showStickyBar && product.inventory !== 0 && (
        <div
          className="max-lg:hidden flex fixed bottom-0 left-0 right-0 z-50 items-center justify-between gap-4 px-6 xl:px-10 py-3.5 xl:py-4 border-t border-neutral-200 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
          role="region"
          aria-label="Quick purchase"
        >
          <div className="max-w-7xl mx-auto w-full flex flex-wrap items-center justify-between gap-4 xl:gap-6">
            <div className="flex flex-wrap items-center gap-4 xl:gap-6 min-w-0">
              <p className="text-lg xl:text-xl font-semibold text-neutral-900 tabular-nums">
                {(product.variants?.length > 1 ? variant?.compareAtPrice : product.compareAtPrice) && (
                  <span className="text-neutral-500 line-through text-sm mr-2">
                    {formatPrice(product.variants?.length > 1 ? variant?.compareAtPrice : product.compareAtPrice, currency)}
                  </span>
                )}
                {formatPrice(price, currency)}
              </p>
              <ProductRatingSummary
                product={product}
                starClassName="text-sm xl:text-base"
                countClassName="text-xs text-neutral-500"
                className="hidden sm:flex"
              />
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end flex-1 min-w-[280px]">
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
                className={`checkout-cta-animated cta-shimmer-gold relative z-0 rounded-full sm:rounded-2xl bg-gold-500 px-4 py-2 text-xs font-semibold text-neutral-900 hover:bg-gold-600 transition shadow-gold-md sm:min-w-[120px] disabled:opacity-90 disabled:pointer-events-none ${
                  orderNowVibrate && !orderNowNavigating ? 'animate-vibrate' : ''
                }`}
              >
                <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
                  {orderNowNavigating ? (
                    <span aria-hidden>
                      <Spinner className="h-3.5 w-3.5 border-neutral-900/25 border-t-neutral-900" />
                    </span>
                  ) : null}
                  Order Now
                </span>
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
                className={`rounded-full sm:rounded-2xl border-2 border-neutral-800 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-900 hover:bg-neutral-50 transition sm:min-w-[100px] disabled:opacity-50 disabled:pointer-events-none ${
                  addCartVibrate ? 'animate-vibrate' : 'animate-cta-attract hover:animate-none'
                }`}
              >
                Add to cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
