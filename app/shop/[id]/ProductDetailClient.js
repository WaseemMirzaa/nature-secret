'use client';

import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect, useLayoutEffect, useRef, memo } from 'react';
import Link from '@/components/Link';
import Image, { getImageProps } from 'next/image';
import { useProductsStore, useCartStore, useCartOpenStore, useWishlistStore, useCurrencyStore } from '@/lib/store';
import { useBreadcrumbLabel } from '@/lib/BreadcrumbContext';
import {
  PRODUCT_HERO_IMAGE_QUALITY,
  PRODUCT_HERO_IMAGE_SIZES,
  SHIPPING_POLICY,
  RETURN_POLICY,
} from '@/lib/constants';
import {
  trackViewContentWhenReady,
  trackLandingPageViewForProduct,
  trackAddToCart,
  trackAddToWishlist,
  trackOutOfStockView,
  trackInitiateCheckout,
  metaContentId,
  metaCategoryId,
} from '@/lib/analytics';
import { metaDebug, isMetaDebugEnabled } from '@/lib/metaDebug';
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
import {
  extractIntroParagraphsFromDescription,
  extractHelpsWithLines,
  parseHighlightLine,
  pickBestValueVariantId,
} from '@/lib/productDetailMobileParse';
import { ReviewMediaBlock, normalizeReviewMediaItems, mediaItemIsVideo, mediaItemIsAudio } from '@/components/review/ReviewMediaBlock';
import { canonicalVariantId } from '@/lib/cartLine';
import { InlineLoader, Spinner } from '@/components/ui/PageLoader';
import { CustomerRatingsTrustCard } from '@/components/product/CustomerRatingsTrustCard';

const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** `gold-*` in tailwind is warm stone; amber reads as real stars (matches ProductRatingSummary). */
const REVIEW_STAR_FILLED = 'text-amber-500 leading-none';
const REVIEW_STAR_EMPTY = 'text-neutral-300 leading-none';

const ProductRatingSummary = memo(function ProductRatingSummary({
  product,
  starClassName = '',
  countClassName = '',
  className = 'flex flex-wrap items-center justify-end gap-x-1',
}) {
  const r = Math.min(5, Math.round(Number(product?.rating) || 0));
  return (
    <div className={className}>
      <span className={`text-amber-500 ${starClassName}`}>{'★'.repeat(r)}</span>
      <span className={`text-neutral-300 ${starClassName}`}>{'★'.repeat(5 - r)}</span>
      <span className={`text-neutral-500 ${countClassName}`}>({product?.reviewCount ?? 0} reviews)</span>
    </div>
  );
});

/** `gold-*` in tailwind is warm stone — use amber + neutral for real star contrast (matches summary above). */
const ReviewStarsInline = memo(function ReviewStarsInline({ rating, className = '' }) {
  const n = Math.min(5, Math.max(0, Math.round(Number(rating) || 0)));
  return (
    <span className={`inline-flex select-none items-center gap-0 tracking-tight ${className}`} aria-hidden>
      <span className="text-amber-500">{'★'.repeat(n)}</span>
      <span className="text-neutral-300">{'★'.repeat(5 - n)}</span>
    </span>
  );
});

const ProductTrustBar = memo(function ProductTrustBar({ product, className = '', variant = 'text' }) {
  const n = product?.reviewCount != null && product.reviewCount > 0 ? product.reviewCount : 37;
  const labels = ['Cash on Delivery', 'Free Shipping', `${n} Reviews`];
  if (variant === 'mobileStrip') {
    const avg = Number(product?.rating);
    const avgShow = Number.isFinite(avg) && avg > 0 ? `${(Math.round(avg * 10) / 10).toFixed(1)}★ · ` : '';
    return (
      <div
        className={`rounded-xl border border-neutral-200/90 bg-white px-3 py-2.5 shadow-sm ${className}`}
        role="group"
        aria-label="Trust highlights"
      >
        <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-[11px] font-semibold leading-snug text-neutral-900">
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-950 ring-1 ring-emerald-200/70">
            Cash on Delivery Available
          </span>
          <span className="text-neutral-300" aria-hidden>
            ·
          </span>
          <span className="inline-flex items-center gap-1 text-neutral-800">
            <svg className="h-3.5 w-3.5 shrink-0 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1h-1m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
              />
            </svg>
            Free shipping
          </span>
          <span className="text-neutral-300" aria-hidden>
            ·
          </span>
          <span className="text-neutral-700">
            {avgShow}
            {Number(n).toLocaleString('en-US')} reviews
          </span>
        </p>
        <p className="mt-1 text-center text-[10px] font-medium text-neutral-500">3–7 day delivery · 7-day returns</p>
      </div>
    );
  }
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
      {labels.map((label) => (
        <span key={label} className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-200 bg-white text-[10px] text-neutral-700" aria-hidden>
            ✓
          </span>
          {label}
        </span>
      ))}
    </div>
  );
});

function scrubMedicalTerms(input = '') {
  const text = String(input || '');
  return text;
}

/** Curated review body: `quote` + newline + `---` + newline + `outcome`, or em-dash split, for PDP outcome line. */
function splitReviewQuoteAndOutcome(body) {
  const raw = String(body || '').trim();
  if (!raw) return { quote: '', outcome: '' };
  const triple = /\n\s*-{3,}\s*\n/;
  if (triple.test(raw)) {
    const bits = raw.split(triple);
    const rest = bits.slice(1).join('\n---\n').trim();
    return { quote: scrubMedicalTerms(bits[0].trim()), outcome: scrubMedicalTerms(rest) };
  }
  const parts = raw.split(/\s+[—–]\s+/);
  if (parts.length >= 2) {
    return {
      quote: scrubMedicalTerms(parts[0].trim()),
      outcome: scrubMedicalTerms(parts.slice(1).join(' ').trim()),
    };
  }
  return { quote: scrubMedicalTerms(raw), outcome: '' };
}

function PdpMobileReviewPeek({ reviews, resolveImageUrl }) {
  if (!Array.isArray(reviews) || reviews.length === 0) return null;
  return (
    <div className="mt-4 border-t border-neutral-100 pt-4" aria-label="Recent buyer reviews">
      <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">What buyers say</p>
      <ul className="space-y-2.5">
        {reviews.map((r) => {
          const { quote, outcome } = splitReviewQuoteAndOutcome(r.body);
          const mediaItems = normalizeReviewMediaItems(r);
          return (
            <li key={r.id} className="rounded-xl border border-neutral-100 bg-neutral-50/90 px-3 py-2.5">
              {mediaItems.length > 0 ? (
                <div className="mb-2 space-y-2">
                  {mediaItems.map((m, mi) => (
                    <ReviewMediaBlock
                      key={`${r.id}-peek-${mi}-${m.url?.slice?.(0, 20) || mi}`}
                      item={m}
                      resolveImageUrl={resolveImageUrl}
                      priority={false}
                    />
                  ))}
                </div>
              ) : null}
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <ReviewStarsInline rating={r.rating} className="scale-90" />
                <span className="truncate text-xs font-semibold text-neutral-900">{r.authorName}</span>
              </div>
              {quote ? <p className="text-[12px] leading-snug text-neutral-700">{quote}</p> : null}
              {outcome ? (
                <p className="mt-1.5 border-t border-neutral-200/80 pt-1.5 text-[11px] font-semibold leading-snug text-emerald-900">
                  Outcome: {outcome}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
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
    variantId: canonicalVariantId(p, v),
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
  const products = useMemo(
    () => (apiProduct ? [apiProduct, ...storeProducts.filter((p) => p.id !== apiProduct.id)] : storeProducts),
    [apiProduct, storeProducts],
  );
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
  const [faqOpenDesktop, setFaqOpenDesktop] = useState(null);
  /** Desktop (lg+): single open accordion id — details | ship | disc | faq-{i} */
  const [zoom, setZoom] = useState(false);
  const [addCartVibrate, setAddCartVibrate] = useState(false);
  const [reviews, setReviews] = useState(() => (Array.isArray(initialReviews) ? initialReviews : []));
  const [reviewsExpanded, setReviewsExpanded] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [orderNowVibrate, setOrderNowVibrate] = useState(false);
  const [orderNowNavigating, setOrderNowNavigating] = useState(false);
  const orderNowNavBusyRef = useRef(false);
  const [addCartMobileNavigating, setAddCartMobileNavigating] = useState(false);
  const addCartMobileNavBusyRef = useRef(false);
  const [reviewMediaReady, setReviewMediaReady] = useState(false);
  const orderNowLiveRef = useRef({
    productLoading: true,
    product: null,
    variant: null,
    qtyEffective: 1,
    currency: 'PKR',
  });
  /** One Meta ViewContent per PDP navigation (product id); reset when slug/id changes. */
  const viewContentSentForKeyRef = useRef(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const router = useRouter();
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewFiles, setReviewFiles] = useState([]);
  const purchasePanelRef = useRef(null);
  const reviewsRailRef = useRef(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [isLg, setIsLg] = useState(false);
  const [productDisclaimerTitle, setProductDisclaimerTitle] = useState(() =>
    typeof initialContentSettings?.productDisclaimerTitle === 'string'
      ? initialContentSettings.productDisclaimerTitle
      : '',
  );
  const [productDisclaimerText, setProductDisclaimerText] = useState(() =>
    typeof initialContentSettings?.productDisclaimerText === 'string'
      ? initialContentSettings.productDisclaimerText
      : '',
  );
  const [disclaimerExpanded, setDisclaimerExpanded] = useState(false);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    if (!product || product.inventory === 0) {
      root.style.removeProperty('--ns-pdp-sticky-bottom');
      return undefined;
    }
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = () => {
      if (!product || product.inventory === 0) {
        root.style.removeProperty('--ns-pdp-sticky-bottom');
        return;
      }
      if (mq.matches) {
        root.style.setProperty('--ns-pdp-sticky-bottom', showStickyBar ? '5.75rem' : '0px');
      } else {
        root.style.setProperty('--ns-pdp-sticky-bottom', '7.5rem');
      }
    };
    apply();
    mq.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
      root.style.removeProperty('--ns-pdp-sticky-bottom');
    };
  }, [product?.id, product?.inventory, showStickyBar]);

  useLayoutEffect(() => {
    setDisclaimerExpanded(false);
    setReviewsExpanded(false);
    setFaqOpenDesktop(null);
    viewContentSentForKeyRef.current = null;
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

  // Defer review images/videos until after the hero + buy section has painted
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let id;
    if (typeof window.requestIdleCallback === 'function') {
      id = window.requestIdleCallback(() => setReviewMediaReady(true), { timeout: 2000 });
    } else {
      id = setTimeout(() => setReviewMediaReady(true), 300);
    }
    return () => {
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    if (initialContentSettings != null) {
      setProductDisclaimerTitle(
        typeof initialContentSettings.productDisclaimerTitle === 'string'
          ? initialContentSettings.productDisclaimerTitle
          : '',
      );
      setProductDisclaimerText(
        typeof initialContentSettings.productDisclaimerText === 'string'
          ? initialContentSettings.productDisclaimerText
          : '',
      );
      return;
    }
    let cancelled = false;
    getContentSettings()
      .then((r) => {
        if (cancelled || !r) return;
        setProductDisclaimerTitle(typeof r.productDisclaimerTitle === 'string' ? r.productDisclaimerTitle : '');
        setProductDisclaimerText(typeof r.productDisclaimerText === 'string' ? r.productDisclaimerText : '');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [initialContentSettings]);

  const variant = selectedVariant ?? defaultVariant ?? product?.variants?.[0];
  const isProductDisclaimerActive = useMemo(
    () =>
      !!product?.showDisclaimer &&
      ((Array.isArray(product.disclaimerItems) && product.disclaimerItems.some((x) => String(x || '').trim().length > 0)) ||
        String(product?.disclaimerText || '').trim().length > 0),
    [product],
  );
  const disclaimerItemsToShow = useMemo(() => {
    if (!product) return [];
    if (product.showDisclaimer) {
      const fromItems = Array.isArray(product.disclaimerItems)
        ? product.disclaimerItems.map((x) => String(x ?? '').trim()).filter(Boolean)
        : [];
      if (fromItems.length) return fromItems;
      const fromText = String(product.disclaimerText || '').trim();
      if (fromText) return fromText.split(/\n+/).map((s) => s.trim()).filter(Boolean);
      return [];
    }
    const global = String(productDisclaimerText || '').trim();
    if (!global) return [];
    return global.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  }, [product, productDisclaimerText]);
  const disclaimerEnabled = disclaimerItemsToShow.length > 0;
  const disclaimerTitleToShow = useMemo(() => {
    if (!product) return 'Important Note';
    if (isProductDisclaimerActive) {
      return String(product.disclaimerTitle || '').trim() || 'Important Note';
    }
    return String(productDisclaimerTitle || '').trim() || 'Important Note';
  }, [product, productDisclaimerTitle, isProductDisclaimerActive]);
  const customProductBadges = Array.isArray(product?.productBadges)
    ? product.productBadges.filter((b) => String(b?.imageUrl || '').trim())
    : [];
  const variantImageList = (variant?.images && variant.images.length) ? variant.images : (variant?.image ? [variant.image] : product?.images || []);
  const galleryResolvedUrls = useMemo(() => {
    const list = (variant?.images && variant.images.length) ? variant.images : (variant?.image ? [variant.image] : product?.images || []);
    return list.map((u) => resolveImageUrl(u)).filter(Boolean);
  }, [variant?.images, variant?.image, product?.images]);
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

  useLayoutEffect(() => {
    if (!product) return;
    const vcKey = product.id || slugOrId;
    if (viewContentSentForKeyRef.current === vcKey) return;
    viewContentSentForKeyRef.current = vcKey;
    const variants = Array.isArray(product.variants) ? product.variants : [];
    let cents = Number(product.price) || 0;
    if (variants.length > 0) {
      const vals = variants.map((v) => Number(v.price)).filter((p) => Number.isFinite(p) && p > 0);
      if (vals.length) cents = Math.min(...vals);
    }
    trackViewContentWhenReady(product, cents / 100, currency);
    trackLandingPageViewForProduct(product, cents / 100, currency);
    if ((product.inventory ?? 0) === 0) trackOutOfStockView(product);
  }, [product, currency, slugOrId]);

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

  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartOpenStore((s) => s.open);
  const cartTotalQty = useCartStore((s) => s.items.reduce((n, i) => n + (Number(i.qty) || 1), 0));
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

  const introParagraphs = useMemo(
    () => (product?.description ? extractIntroParagraphsFromDescription(product.description) : []),
    [product?.description],
  );
  const categoryCrumb = useMemo(() => {
    const c = product?.category;
    if (!c || typeof c !== 'object') return null;
    const name = String(c.name || '').trim();
    const slug = String(c.slug || '').trim();
    if (!name) return null;
    return { name, slug: slug || null };
  }, [product?.category]);
  const storyBullets = useMemo(() => introParagraphs.slice(0, 3).filter(Boolean), [introParagraphs]);
  const helpsWithLines = useMemo(
    () => (product?.description ? extractHelpsWithLines(product.description) : []),
    [product?.description],
  );
  const bestValueVariantId = useMemo(() => pickBestValueVariantId(product?.variants), [product?.variants]);

  const userReviewsList = useMemo(() => {
    if (!Array.isArray(reviews)) return [];
    return reviews.filter((r) => !r.collection || r.collection === 'user');
  }, [reviews]);

  const liveReviewsList = useMemo(() => {
    if (!Array.isArray(reviews)) return [];
    const list = reviews.filter((r) => r.collection === 'live');
    return [...list].sort((a, b) => {
      const aHas = normalizeReviewMediaItems(a).length > 0 ? 0 : 1;
      const bHas = normalizeReviewMediaItems(b).length > 0 ? 0 : 1;
      return aHas - bHas;
    });
  }, [reviews]);

  const fiveStarReviews = useMemo(
    () => userReviewsList.filter((r) => (r.rating || 0) >= 5),
    [userReviewsList]
  );
  const primaryReviews = fiveStarReviews.length > 0 ? fiveStarReviews : userReviewsList;
  const mobileTopReviews = useMemo(() => {
    const cap = 3;
    const seen = new Set();
    const out = [];
    const push = (r) => {
      if (!r?.id || seen.has(r.id) || out.length >= cap) return;
      seen.add(r.id);
      out.push(r);
    };
    const withMedia = [];
    const textOnly = [];
    for (const r of primaryReviews) {
      if (normalizeReviewMediaItems(r).length > 0) withMedia.push(r);
      else textOnly.push(r);
    }
    for (const r of [...withMedia, ...textOnly]) push(r);
    if (out.length < cap) {
      for (const r of liveReviewsList) {
        if (out.length >= cap) break;
        if (normalizeReviewMediaItems(r).length === 0) continue;
        push(r);
      }
    }
    return out;
  }, [primaryReviews, liveReviewsList]);

  /** Best-first rail (user + live): rating, media, length — cap for horizontal PDP. */
  const reviewsShowcaseRanked = useMemo(() => {
    const score = (r) => {
      if (!r?.id) return -1e9;
      let s = (Number(r.rating) || 0) * 14;
      s += normalizeReviewMediaItems(r).length * 18;
      const plain = String(r.body || '')
        .replace(/<[^>]+>/g, ' ')
        .trim();
      s += Math.min(45, Math.floor(plain.length / 6));
      if (r.collection === 'live') s += 5;
      return s;
    };
    const byId = new Map();
    for (const r of [...userReviewsList, ...liveReviewsList]) {
      if (!r?.id) continue;
      const prev = byId.get(r.id);
      if (!prev || score(r) > score(prev)) byId.set(r.id, r);
    }
    return [...byId.values()].sort((a, b) => score(b) - score(a));
  }, [userReviewsList, liveReviewsList]);

  const reviewsRailList = useMemo(() => {
    const cap = reviewsExpanded ? Math.min(48, reviewsShowcaseRanked.length) : Math.min(10, reviewsShowcaseRanked.length);
    return reviewsShowcaseRanked.slice(0, cap);
  }, [reviewsShowcaseRanked, reviewsExpanded]);

  const customerRatingTrust = useMemo(() => {
    if (!product) return null;
    const rated = userReviewsList.filter((r) => Number(r.rating) > 0);
    const computedAvg =
      rated.length > 0
        ? rated.reduce((s, r) => s + Math.min(5, Math.max(0, Number(r.rating))), 0) / rated.length
        : 0;
    const apiCount = Math.max(0, Math.floor(Number(product.reviewCount))) || 0;
    const apiAvg = Number(product.rating);
    const hasApiAvg = Number.isFinite(apiAvg) && apiAvg > 0;

    if (apiCount > 0 && hasApiAvg) {
      return { count: apiCount, average: Math.min(5, apiAvg) };
    }
    if (rated.length > 0 && computedAvg > 0 && Number.isFinite(computedAvg)) {
      return { count: rated.length, average: Math.min(5, computedAvg) };
    }
    return null;
  }, [product, userReviewsList]);

  /** Full-screen loader only when we have nothing to render yet. If catalog already has this product (store), show PDP so Order Now / cart work while refetch runs. */
  if (productLoading && !product) {
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
  const showVariantPicker = product.variants?.length > 1;
  const inv = Number(product?.inventory);
  const lowStockUrgent = Number.isFinite(inv) && inv > 0 && inv <= 30;

  /**
   * Add to cart (PDP): rehydrate cart → GET `/products` by slug or id → map UI variant to fetched rows →
   * line price/name/image from API → `addItem` → `trackAddToCart` with that product object (Meta uses `advertisingId` / id).
   */
  function resolveLinePriceCents(p, vForLine) {
    const raw = vForLine?.price ?? p?.price;
    if (raw == null && raw !== 0) return null;
    const n =
      typeof raw === 'number' && Number.isFinite(raw)
        ? raw
        : parseFloat(String(raw).trim().replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  /** Pick variant row on freshly fetched product matching current UI selection (or cheapest / only). */
  function variantForFetchedProduct(p, uiVariant) {
    const vars = Array.isArray(p?.variants) ? p.variants : [];
    if (!vars.length) return null;
    const selId = uiVariant?.id;
    if (selId) {
      const hit = vars.find((x) => x.id === selId);
      if (hit) return hit;
    }
    if (vars.length === 1) return vars[0];
    return vars.reduce(
      (best, x) =>
        best == null || (Number(x.price) || 0) < (Number(best.price) || 0) ? x : best,
      null,
    );
  }

  function buildCartLinePayload(p, vForLine, qty) {
    if (!p?.id) return null;
    const linePrice = resolveLinePriceCents(p, vForLine);
    if (linePrice == null) return null;
    const image =
      (vForLine?.images && vForLine.images[0]) || vForLine?.image || p?.images?.[0];
    return {
      productId: p.id,
      variantId: canonicalVariantId(p, vForLine),
      price: linePrice,
      name: p.name,
      image,
      qty,
    };
  }

  async function applyAddToCartFromFetched() {
    const qty = effectiveQty;
    let p = product;
    if (slugOrId) {
      try {
        const fetched = await (isUuid(slugOrId) ? getProductById(slugOrId) : getProductBySlug(slugOrId));
        if (fetched?.id) p = fetched;
      } catch {
        /* use in-memory product if network fails */
      }
    }
    if (!p?.id) return;
    const vForLine = variantForFetchedProduct(p, variant);
    const line = buildCartLinePayload(p, vForLine, qty);
    if (!line) return;
    const vk = String(line.variantId ?? '');
    const itemsBefore = useCartStore.getState().items;
    const beforeRow = itemsBefore.find(
      (i) => i.productId === line.productId && String(i.variantId ?? '') === vk
    );
    const prevQty = beforeRow?.qty ?? 0;
    addItem(line);
    const afterRow = useCartStore.getState().items.find(
      (i) => i.productId === line.productId && String(i.variantId ?? '') === vk
    );
    const delta = (afterRow?.qty ?? 0) - prevQty;
    openCart();
    const trackQty = delta > 0 ? delta : Math.max(1, Number(line.qty) || 1);
    trackAddToCart(p, line.price / 100, trackQty, currency);
    if (delta <= 0 && isMetaDebugEnabled()) {
      metaDebug('handleAddToCart', {
        usedFallbackQty: true,
        delta,
        trackQty,
        productId: p?.id,
        variantId: line.variantId,
      });
    }
  }

  async function handleAddToCart() {
    if (typeof window === 'undefined') return;
    try {
      if (!useCartStore.persist.hasHydrated()) {
        await useCartStore.persist.rehydrate();
      }
    } catch {
      /* continue */
    }
    await applyAddToCartFromFetched();
  }

  /** Mobile-only: waits for product data (handles page-load taps), sets qty (no accumulate), goes to /checkout. */
  async function handleAddToCartMobile() {
    if (typeof window === 'undefined') return;
    if (addCartMobileNavBusyRef.current) return;
    addCartMobileNavBusyRef.current = true;
    setAddCartMobileNavigating(true);
    const readyDeadlineMs = 25000;
    const readyStarted = Date.now();
    try {
      if (!useCartStore.persist.hasHydrated()) {
        await useCartStore.persist.rehydrate();
      }
      // Wait for live product data (same pattern as Order Now — handles taps during page load)
      while (Date.now() - readyStarted < readyDeadlineMs) {
        const ctx = orderNowLiveRef.current;
        if (buildOrderNowLineFromCtx(ctx)) break;
        if (!ctx.productLoading) break;
        await new Promise((r) => setTimeout(r, 80));
      }
      const ctx = orderNowLiveRef.current;
      const line = buildOrderNowLineFromCtx(ctx);
      const p = ctx.product;
      if (!line || !p) return;
      const vk = String(line.variantId ?? '');
      const existing = useCartStore.getState().items.find(
        (i) => i.productId === line.productId && String(i.variantId ?? '') === vk
      );
      // SET qty instead of accumulating — prevents double-price bug on revisit
      if (existing) {
        useCartStore.getState().updateQty(line.productId, line.variantId, line.qty);
      } else {
        useCartStore.getState().addItem(line);
        trackAddToCart(p, line.price / 100, Math.max(1, Number(line.qty) || 1), ctx.currency);
      }
      // Go straight to checkout — no cart drawer friction
      try {
        const navP = router.push('/checkout');
        if (navP && typeof navP.then === 'function') {
          await Promise.race([
            navP,
            new Promise((_, reject) => setTimeout(() => reject(new Error('nav-timeout')), 15000)),
          ]);
          if (!/^\/checkout(\/|$)/.test(window.location.pathname)) {
            window.location.assign('/checkout');
          }
        } else {
          window.location.assign('/checkout');
        }
      } catch {
        window.location.assign('/checkout');
      }
    } finally {
      addCartMobileNavBusyRef.current = false;
      setAddCartMobileNavigating(false);
    }
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
        // Enough PDP data to build a cart line — proceed (do not also require !productLoading).
        if (buildOrderNowLineFromCtx(ctx)) break;
        // Fetch settled: stop spinning even if line builder fails (avoids 25s "Please wait" with no nav).
        if (!ctx.productLoading) break;
        await new Promise((r) => setTimeout(r, 80));
      }
      for (let attempt = 0; attempt < maxNavAttempts; attempt++) {
        const ctx = orderNowLiveRef.current;
        const line = buildOrderNowLineFromCtx(ctx);
        const p = ctx.product;
        if (line && p) {
          const vk = String(line.variantId ?? '');
          const itemsBefore = useCartStore.getState().items;
          const beforeRow = itemsBefore.find(
            (i) => i.productId === line.productId && String(i.variantId ?? '') === vk
          );
          // Only add if not already in cart — prevents re-adding on repeat taps
          if (!beforeRow) {
          useCartStore.getState().addItem(line);
            trackAddToCart(p, line.price / 100, Math.max(1, Number(line.qty) || 1), ctx.currency);
          }
          const itemsAfter = useCartStore.getState().items;
          if (itemsAfter.length) {
            const grandCents = itemsAfter.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
            const contentIds = itemsAfter
              .map((i) => {
                const pr = products.find((x) => x.id === i.productId);
                return pr ? metaContentId(pr) : '';
              })
              .filter(Boolean);
            const categoryIds = Array.from(
              new Set(
                itemsAfter
                  .map((i) => {
                    const pr = products.find((x) => x.id === i.productId);
                    return pr ? metaCategoryId(pr) : '';
                  })
                  .filter(Boolean),
              ),
            );
            const numItems = itemsAfter.reduce((n, i) => n + (Number(i.qty) || 1), 0);
            const standardContents =
              itemsAfter.length > 0 &&
              itemsAfter.every((i) => {
                const pr = products.find((x) => x.id === i.productId);
                return Boolean(pr && metaContentId(pr));
              })
                ? itemsAfter.map((i) => {
                    const pr = products.find((x) => x.id === i.productId);
                    return {
                      id: metaContentId(pr),
                      quantity: Math.max(1, Number(i.qty) || 1),
                    };
                  })
                : null;
            trackInitiateCheckout(
              grandCents / 100,
              ctx.currency,
              contentIds,
              numItems,
              contentIds,
              categoryIds,
              standardContents,
            );
          }
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
        media.push({ type: res.type === 'video' ? 'video' : res.type === 'audio' ? 'audio' : 'image', url: res.url });
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
      setReviewMessage('Thank you. Your review is submitted and will appear in few hours.');
    } catch (err) {
      setReviewMessage('Could not submit review. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
  }

  function scrollReviewsRail(dir) {
    const el = reviewsRailRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(300, Math.floor(el.clientWidth * 0.78)), behavior: 'smooth' });
  }

  const hasHelpsOrDescription = helpsWithLines.length > 0 || !!String(product?.description || '').trim();

  function renderPdpHelpsWithReadMore({ compact = false } = {}) {
    const h2Cls = compact
      ? 'text-sm font-semibold tracking-tight text-neutral-900 sm:text-base'
      : 'text-base font-semibold tracking-tight text-neutral-900';
    const ulCls = compact
      ? 'mt-2.5 list-none space-y-2 pl-0 text-[13px] leading-relaxed text-neutral-600 sm:mt-3 sm:text-sm sm:leading-relaxed'
      : 'mt-3 list-none space-y-2.5 pl-0 text-sm leading-relaxed text-neutral-600 sm:text-[15px] sm:leading-[1.65]';
    const descCls = compact
      ? 'product-description text-[13px] leading-relaxed text-neutral-600 sm:text-sm sm:leading-relaxed [&_li]:text-[13px] [&_p]:text-[13px] sm:[&_li]:text-sm sm:[&_p]:text-sm'
      : 'product-description text-sm leading-relaxed text-neutral-600 sm:text-[15px] sm:leading-[1.65] [&_li]:text-sm [&_p]:text-sm sm:[&_li]:text-[15px] sm:[&_p]:text-[15px]';
    return (
      <>
        {helpsWithLines.length > 0 ? (
          <div>
            <h2 className={h2Cls}>Helps With</h2>
            <ul className={ulCls}>
              {helpsWithLines.map((line, i) => {
                const { title, desc } = parseHighlightLine(line);
                return (
                  <li key={`help-r-${i}`}>
                    <span className="font-semibold text-neutral-800">{scrubMedicalTerms(title)}</span>
                    {desc ? <span> {scrubMedicalTerms(desc)}</span> : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
        {product.description && helpsWithLines.length === 0 ? (
          <div className="mt-0">
            <div
              className={`${descCls} transition-all ${
                descriptionExpanded ? '' : compact ? 'max-h-52 overflow-hidden sm:max-h-64' : 'max-h-64 overflow-hidden lg:max-h-72'
              }`}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(scrubMedicalTerms(product.description)) }}
            />
            <button
              type="button"
              onClick={() => setDescriptionExpanded((v) => !v)}
              className={`font-medium text-gold-700 hover:text-gold-600 border-b border-gold-500/50 pb-0.5 ${
                compact ? 'mt-1.5 text-[11px] sm:mt-2 sm:text-xs' : 'mt-2 text-xs sm:text-sm'
              }`}
            >
              {descriptionExpanded ? 'Read less' : 'Read more'}
            </button>
          </div>
        ) : null}
        {product.description && helpsWithLines.length > 0 ? (
          <>
            {descriptionExpanded ? (
              <div
                className={`${descCls} ${compact ? 'mt-4' : 'mt-5'}`}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(scrubMedicalTerms(product.description)) }}
              />
            ) : null}
            <button
              type="button"
              onClick={() => setDescriptionExpanded((v) => !v)}
              className={`font-medium text-gold-700 hover:text-gold-600 border-b border-gold-500/50 pb-0.5 ${
                compact ? 'mt-1.5 text-[11px] sm:text-xs' : `text-xs sm:text-sm ${helpsWithLines.length > 0 ? 'mt-2' : ''}`
              }`}
            >
              {descriptionExpanded ? 'Read less' : 'Read more'}
            </button>
          </>
        ) : null}
      </>
    );
  }

  return (
    <div
      className={`mx-auto max-w-7xl px-3 sm:px-5 lg:px-8 xl:px-10 py-3 sm:py-5 lg:py-12 xl:py-14 ${
        showStickyBar ? 'lg:pb-28 xl:pb-32' : ''
      } ${product.inventory !== 0 ? 'max-lg:pb-28' : ''}`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-10 xl:gap-x-14 max-lg:gap-y-3 sm:max-lg:gap-y-4 animate-slide-up items-start">
        {/* Left: gallery — rail thumbs + arrows on lg; mobile strip unchanged */}
        <div className="relative mx-auto w-full lg:col-span-7 lg:mx-0 lg:max-w-none">
          <div className="max-lg:rounded-xl max-lg:overflow-hidden max-lg:border max-lg:border-neutral-200 max-lg:bg-neutral-50 max-lg:p-1.5 sm:max-lg:p-2 max-lg:flex max-lg:flex-col max-lg:items-stretch max-lg:gap-2.5 sm:max-lg:gap-3 lg:flex lg:max-w-none lg:flex-row lg:items-start lg:gap-4 lg:border-0 lg:bg-transparent lg:p-0">
            <div className="hidden w-[4.75rem] shrink-0 flex-col gap-2 overflow-y-auto overflow-x-hidden pr-0.5 [scrollbar-width:thin] lg:flex max-h-[min(70vh,34rem)]">
              {variantImageList.length > 1
                ? variantImageList.map((url, i) => {
                    const resolved = resolveImageUrl(url);
                    return resolved ? (
                      <button
                        key={`lg-v-${i}`}
                        type="button"
                        onClick={() => setSelectedImageIndex(i)}
                        className={`relative flex h-[4.75rem] w-[4.75rem] shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 ${
                          selectedImageIndex === i
                            ? 'border-neutral-900 ring-2 ring-neutral-400'
                            : 'border-neutral-300'
                        }`}
                      >
                        <Image
                          src={resolved}
                          alt={`${productDisplayName} ${i + 1}`}
                          width={80}
                          height={80}
                          className="h-full w-full object-contain"
                          sizes="76px"
                          quality={65}
                          loading="eager"
                          fetchPriority="low"
                        />
                      </button>
                    ) : null;
                  })
                : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
          <div
            className="relative w-full shrink-0 overflow-hidden rounded-lg sm:rounded-xl lg:rounded-2xl bg-neutral-100 shadow-sm lg:shadow-premium ring-1 ring-neutral-200/60 max-lg:rounded-[1.1rem] max-lg:border max-lg:border-white/90 max-lg:bg-neutral-50 max-lg:shadow-lift max-lg:ring-neutral-900/[0.04] max-lg:frame-media-inset"
            onMouseEnter={() => setZoom(true)}
            onMouseLeave={() => setZoom(false)}
          >
            {pctOff != null && pctOff > 0 ? (
              <span className="absolute top-3 right-12 z-20 rounded-full border border-neutral-900/12 bg-accent-cream px-2 py-1 text-[10px] sm:text-[11px] font-bold text-neutral-900 shadow-sm lg:hidden">
                {pctOff}% OFF
              </span>
            ) : null}
            <div className="relative isolate w-full h-0 pb-[125%] lg:pb-[100%]">
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
                    priority={true}
                    fetchPriority="high"
                    quality={PRODUCT_HERO_IMAGE_QUALITY}
                    decoding="async"
                    loading="eager"
                  />
                )}
              </div>
            </div>
                {variantImageList.length > 1 ? (
                  <>
                    <button
                      type="button"
                      aria-label="Previous image"
                      className="absolute left-2 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200/90 bg-white/95 text-neutral-800 shadow-md backdrop-blur-sm transition hover:bg-white lg:flex"
                      onClick={() =>
                        setSelectedImageIndex((idx) =>
                          (idx - 1 + variantImageList.length) % variantImageList.length,
                        )
                      }
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label="Next image"
                      className="absolute right-2 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200/90 bg-white/95 text-neutral-800 shadow-md backdrop-blur-sm transition hover:bg-white lg:flex"
                      onClick={() =>
                        setSelectedImageIndex((idx) => (idx + 1) % variantImageList.length)
                      }
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                ) : null}
            <button
              type="button"
              onClick={handleWishlistToggle}
              className="absolute top-3 right-3 z-30 p-2.5 rounded-full bg-white/95 shadow-sm border border-neutral-200/80 hover:border-neutral-400 transition backdrop-blur-sm lg:z-10 lg:bg-white/90 lg:shadow-md lg:hover:bg-white lg:hover:shadow-lg"
              aria-label="Wishlist"
            >
              <svg className="w-5 h-5 text-neutral-700" fill={wishlist.includes(product.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
            </button>
          </div>
              <div className="mt-1.5 flex w-full flex-row flex-nowrap items-center justify-start gap-2 overflow-x-auto overflow-y-visible pb-0.5 [scrollbar-width:thin] sm:mt-2.5 sm:gap-2.5 sm:pb-1 lg:hidden">
            {variantImageList.map((url, i) => {
              const resolved = resolveImageUrl(url);
              return resolved ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImageIndex(i)}
                      className={`relative flex h-[3.75rem] w-[3.75rem] shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 sm:h-16 sm:w-16 sm:rounded-xl ${
                        selectedImageIndex === i
                          ? 'border-neutral-900 ring-2 ring-neutral-200'
                          : 'border-neutral-200'
                      }`}
                >
                  <Image
                    src={resolved}
                    alt={`${productDisplayName} ${i + 1}`}
                    width={80}
                    height={80}
                    className="h-full w-full object-contain"
                    sizes="(max-width: 1023px) 72px, 76px"
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
        </div>

        <div className="hidden min-w-0 lg:col-span-5 lg:block">
          <div
            ref={purchasePanelRef}
            className="mt-8 hidden max-w-2xl border-t border-neutral-200 pt-6 max-lg:hidden lg:mt-0 lg:block lg:w-full lg:max-w-none lg:border-t-0 lg:pt-0 lg:space-y-4 lg:pb-4 xl:max-w-none"
          >
            <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] font-medium text-neutral-500" aria-label="Breadcrumb">
              <Link href="/shop" className="transition hover:text-neutral-800">
                Shop
              </Link>
              <span className="text-neutral-300" aria-hidden>
                /
              </span>
              {categoryCrumb ? (
                <>
                  {categoryCrumb.slug ? (
                    <Link
                      href={`/shop?category=${encodeURIComponent(categoryCrumb.slug)}`}
                      className="transition hover:text-neutral-800"
                    >
                      {categoryCrumb.name}
                    </Link>
                  ) : (
                    <span className="text-neutral-600">{categoryCrumb.name}</span>
                  )}
                  <span className="text-neutral-300" aria-hidden>
                    /
                  </span>
                </>
              ) : null}
              <span className="min-w-0 max-w-[12rem] truncate text-neutral-900 xl:max-w-none">{productDisplayName}</span>
            </nav>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-neutral-900 xl:text-[2.125rem]">{productDisplayName}</h1>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-2xl font-bold tabular-nums text-neutral-900 xl:text-[1.75rem]">{formatPrice(price, currency)}</span>
              {(product.variants?.length > 1 ? variant?.compareAtPrice : product.compareAtPrice) ? (
                <span className="text-lg text-neutral-400 line-through tabular-nums xl:text-xl">
                  {formatPrice(product.variants?.length > 1 ? variant?.compareAtPrice : product.compareAtPrice, currency)}
                </span>
              ) : null}
              {saveLineCents != null && saveLineCents > 0 ? (
                <span className="rounded-full border border-neutral-900/10 bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-900 shadow-sm">
                  Save {formatPrice(saveLineCents, currency)}
                </span>
              ) : null}
              {pctOff != null && pctOff > 0 ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900">{pctOff}% off</span>
              ) : null}
            </div>
            {hasHelpsOrDescription ? (
              renderPdpHelpsWithReadMore({ compact: false })
            ) : customerRatingTrust ? (
              <CustomerRatingsTrustCard count={customerRatingTrust.count} average={customerRatingTrust.average} />
            ) : (
              <ProductRatingSummary
                product={product}
                starClassName="text-lg leading-none xl:text-xl"
                countClassName="text-sm"
                className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5"
              />
            )}
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                {product.variants?.length > 1 ? (
                  <div className="min-w-0 flex-1">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Size / variant</p>
                    <div className="flex flex-wrap gap-2 lg:gap-2.5">
                      {product.variants.map((v) => {
                        const sel = variant?.id === v.id;
                        const showStrike = v.compareAtPrice != null && Number(v.compareAtPrice) > Number(v.price || 0);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setSelectedVariant(v)}
                            className={`rounded-full border-2 px-4 py-2 text-left text-sm font-medium transition sm:rounded-2xl ${
                              sel
                                ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm'
                                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                            }`}
                          >
                            <span className="block leading-tight">{v.name}</span>
                            <span className={`mt-1 block text-xs font-bold tabular-nums ${sel ? 'text-neutral-100' : 'text-neutral-900'}`}>
                              {formatPrice(v.price, currency)}
                            </span>
                            {showStrike ? (
                              <span className="mt-0.5 block text-[11px] tabular-nums line-through text-neutral-400">
                                {formatPrice(v.compareAtPrice, currency)}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {!showVariantPicker ? (
                  <div className="shrink-0 pt-0.5">
                    <ProductRatingSummary
                      product={product}
                      starClassName="text-lg leading-none xl:text-xl"
                      countClassName="text-sm"
                      className="flex flex-col items-end gap-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-x-1"
                    />
                  </div>
                ) : (
                  <div className="shrink-0 pt-0.5 text-right lg:max-w-[11rem] xl:max-w-none">
                    <ProductRatingSummary
                      product={product}
                      starClassName="text-lg leading-none xl:text-xl"
                      countClassName="text-sm mt-1 sm:mt-0 sm:ml-1"
                      className="flex flex-col items-end gap-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-x-1"
                    />
                  </div>
                )}
              </div>
            </div>
            {product.inventory === 0 ? (
              <span className="block rounded-2xl border border-neutral-200 bg-neutral-100 py-3.5 text-center text-sm font-medium text-neutral-500">
                Out of stock
              </span>
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-3 pt-1">
                  <div>
                    <label
                      htmlFor={`product-qty-${formFieldSuffix}`}
                      className="mb-2 block text-xs font-semibold uppercase tracking-wider text-neutral-500"
                    >
                      Quantity
                    </label>
                    <div className="inline-flex items-stretch overflow-hidden rounded-full border-2 border-neutral-200 bg-white">
                      <button
                        type="button"
                        onClick={() => setQty((n) => Math.max(1, (n || 1) - 1))}
                        className="flex h-11 w-11 shrink-0 items-center justify-center text-lg leading-none text-neutral-600 hover:bg-neutral-50"
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
                          className="m-0 h-11 w-full min-w-0 border-0 bg-transparent p-0 text-center text-sm font-semibold tabular-nums text-neutral-900 align-middle leading-none focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setQty((n) => Math.min(99, (n || 1) + 1))}
                        className="flex h-11 w-11 shrink-0 items-center justify-center text-lg leading-none text-neutral-600 hover:bg-neutral-50"
                        aria-label="Increase"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={orderNowNavigating}
                    onClick={() => {
                      if (orderNowNavigating) return;
                      void handleAddToCart();
                      setAddCartVibrate(true);
                      setTimeout(() => setAddCartVibrate(false), 400);
                    }}
                    className={`min-h-[2.75rem] min-w-[10rem] flex-1 rounded-xl border-2 border-neutral-900 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-50 ${
                      addCartVibrate ? 'animate-vibrate' : ''
                    }`}
                  >
                    Add to cart
                  </button>
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
                  className={`btn-pdp-order-now relative z-0 flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[15px] font-bold tracking-tight shadow-md transition hover:shadow-lg disabled:pointer-events-none disabled:opacity-90 ${
                    orderNowVibrate && !orderNowNavigating ? 'animate-vibrate' : ''
                  }`}
                >
                  {orderNowNavigating ? (
                    <>
                      <Spinner className="relative z-10 h-4 w-4 border-white/25 border-t-white" />
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
                <p className="flex items-center gap-1.5 text-xs font-medium text-gold-700">
                  <svg className="h-4 w-4 shrink-0 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1h-1m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                    />
                  </svg>
                  Free shipping
                </p>
              </>
            )}
            {product.inventory !== 0 ? (
              <div className="pt-1">
                <ProductTrustBar product={product} variant="pills" />
              </div>
            ) : null}
            {customProductBadges.length > 0 ? (
              <div className="flex flex-wrap items-center pt-2" style={{ gap: 10 }}>
                {customProductBadges.map((b, idx) => {
                  const src = resolveImageUrl(b.imageUrl);
                  const alt = String(b.label || 'Badge').trim() || 'Badge';
                  const bypassOpt = typeof src === 'string' && (src.startsWith('data:') || src.startsWith('blob:'));
                  const img = src ? (
                    <Image
                      src={src}
                      alt={alt}
                      width={124}
                      height={124}
                      className="h-[124px] w-[124px] object-contain"
                      loading="lazy"
                      sizes="124px"
                      unoptimized={bypassOpt}
                    />
                  ) : null;
                  return b.href ? (
                    <a key={`badge-lg-${idx}`} href={b.href} target="_blank" rel="noopener noreferrer" className="shrink-0 hover:opacity-90">
                      {img}
                    </a>
                  ) : (
                    <span key={`badge-lg-${idx}`} className="shrink-0">
                      {img}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <section
          className="col-span-full hidden text-left lg:col-span-12 lg:mt-10 lg:block lg:max-w-none lg:border-t lg:border-neutral-200 lg:pt-10 xl:mt-12 xl:pt-12"
          aria-label="Product details"
        >
          <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-10 xl:gap-x-14">
            <div className="min-w-0 lg:col-span-7">
              {customerRatingTrust && hasHelpsOrDescription ? (
                <div className="mb-6 lg:mb-8">
                  <CustomerRatingsTrustCard count={customerRatingTrust.count} average={customerRatingTrust.average} />
                </div>
              ) : null}
              {(product.faq || []).length > 0 ? (
                <div className="mt-8">
                  <h3 className="mb-2 text-sm font-semibold tracking-tight text-neutral-900">FAQ</h3>
                  <ul className="space-y-0.5">
                    {(product.faq || []).map((item, i) => (
                      <li key={`desk-faq-${i}`} className="border-b border-neutral-100">
                        <button
                          type="button"
                          onClick={() => setFaqOpenDesktop(faqOpenDesktop === i ? null : i)}
                          className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-medium text-neutral-700"
                        >
                          <span className="min-w-0 pr-2">{scrubMedicalTerms(item.q)}</span>
                          <span className="shrink-0">{faqOpenDesktop === i ? '−' : '+'}</span>
                        </button>
                        {faqOpenDesktop === i ? (
                          <p className="pb-3 text-sm leading-relaxed text-neutral-500">{scrubMedicalTerms(item.a)}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            <div className="mt-10 min-w-0 lg:col-span-5 lg:mt-0">
              {disclaimerEnabled ? (
                <div className="mt-0">
                  <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50/90 px-3 py-2.5">
                    <span className="min-w-0 text-xs font-semibold text-neutral-900">{disclaimerTitleToShow}</span>
                    <button
                      type="button"
                      onClick={() => setDisclaimerExpanded((v) => !v)}
                      className="shrink-0 rounded-lg border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-50"
                      aria-expanded={disclaimerExpanded}
                      aria-controls="product-disclaimer-panel-desk-below-gallery"
                      id="product-disclaimer-toggle-desk-below-gallery"
                    >
                      {disclaimerExpanded ? 'Hide' : 'View'}
                    </button>
                  </div>
                  {disclaimerExpanded ? (
                    <div
                      id="product-disclaimer-panel-desk-below-gallery"
                      role="region"
                      aria-labelledby="product-disclaimer-toggle-desk-below-gallery"
                      className="mt-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5"
                    >
                      <ul className="list-disc space-y-1 pl-4 text-sm leading-relaxed text-neutral-700">
                        {disclaimerItemsToShow.map((item, idx) => (
                          <li key={`desk-d2-${idx}-${item.slice(0, 12)}`}>{scrubMedicalTerms(item)}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div
                className={`rounded-2xl border border-neutral-100 bg-neutral-50 p-5 text-sm leading-relaxed text-neutral-600 ${
                  disclaimerEnabled ? 'mt-6' : ''
                }`}
              >
                <p>
                  <strong>Shipping:</strong> {SHIPPING_POLICY}
                </p>
                <p className="mt-2">
                  <strong>Returns:</strong> {RETURN_POLICY}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile / tablet: premium purchase card (feature parity); desktop unchanged */}
        <div className="col-span-full lg:hidden w-full max-w-xl sm:max-w-2xl mx-auto px-1 pb-1 pt-1 sm:px-0">
          <article
            className="overflow-x-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-premium ring-1 ring-neutral-900/[0.035] sm:rounded-[1.75rem]"
            aria-label="Product details and purchase"
          >
            <header className="px-5 pb-5 pt-7 sm:px-7 sm:pb-6 sm:pt-8">
              <h1 className="font-display text-[1.75rem] font-semibold leading-[1.06] tracking-tight text-neutral-900 sm:text-[2rem]">
                {productDisplayName}
              </h1>
            </header>
            <div className="border-t border-neutral-100 bg-gradient-to-b from-neutral-50/90 to-neutral-50/40 px-5 py-4 sm:px-7 sm:py-5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
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
                    <span className="w-full text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800 sm:w-auto">Limited time offer</span>
                  </>
                ) : null}
                {lowStockUrgent && !(saveLineCents != null && saveLineCents > 0) ? (
                  <span className="inline-flex items-center rounded-full border border-neutral-900/15 bg-neutral-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                    Low stock — order soon
                  </span>
                ) : null}
              </div>
              {pctOff != null && pctOff > 0 ? (
                <p className="ns-accent-glass mt-3 flex items-center rounded-xl px-3.5 py-2.5 text-[12px] font-semibold text-neutral-900">
                  <span className="relative z-[1] flex items-center gap-2.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-amber-100 to-[rgb(var(--brand-gold-rgb))] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] ring-1 ring-[rgb(var(--brand-gold-rgb)/0.35)]"
                      aria-hidden
                    />
                    <span>Limited time — sale ends soon</span>
                  </span>
                </p>
              ) : null}
              {lowStockUrgent && saveLineCents != null && saveLineCents > 0 ? (
                <p className="mt-2 text-[11px] font-semibold text-neutral-700">Only {inv} left in stock — selling fast</p>
              ) : null}
              {product.inventory !== 0 ? (
                <div className="mt-3">
                  <ProductTrustBar product={product} variant="mobileStrip" />
                </div>
              ) : null}
              {hasHelpsOrDescription ? (
                <div className="mt-4 border-t border-neutral-100 px-5 pb-1 pt-4 sm:px-7 sm:pt-5">
                  {renderPdpHelpsWithReadMore({ compact: true })}
                </div>
              ) : customerRatingTrust ? (
                <div className="mt-4 border-t border-neutral-100 px-5 pb-1 pt-4 sm:px-7 sm:pt-5">
                  <CustomerRatingsTrustCard count={customerRatingTrust.count} average={customerRatingTrust.average} />
                </div>
              ) : null}
            </div>
            {introParagraphs.length > 0 && !hasHelpsOrDescription ? (
              <div className="space-y-3 border-t border-neutral-100 px-5 py-5 text-[15px] leading-relaxed text-neutral-600 sm:px-7 sm:py-6 sm:text-[0.9375rem] sm:leading-[1.65]">
                {introParagraphs.map((p, i) => (
                  <p key={i}>{scrubMedicalTerms(p)}</p>
                ))}
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
                            aria-label={isBest ? `${v.name}, best value` : v.name}
                            className={`relative flex min-h-[5.25rem] w-full flex-col items-center justify-center rounded-xl border px-3 py-2.5 pt-6 text-center transition duration-200 ${
                              selected
                                ? 'variant-pdp-selected border-transparent shadow-md ring-1 ring-black/[0.06]'
                                : 'border-neutral-200/90 bg-white hover:border-neutral-300 hover:shadow-sm'
                            }`}
                          >
                            {isBest ? (
                              <span className="absolute left-1/2 top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/15 bg-neutral-900 px-2 py-0.5 text-[9px] font-bold uppercase leading-none tracking-[0.08em] text-white shadow-sm">
                                Best value
                              </span>
                            ) : null}
                            <span
                              className={`text-[15px] font-semibold leading-tight ${selected ? 'text-white' : 'text-neutral-900'}`}
                            >
                              {v.name}
                            </span>
                            <span
                              className={`mt-1 text-[14px] font-bold tabular-nums ${selected ? 'text-white' : 'text-neutral-900'}`}
                            >
                              {formatPrice(v.price, currency)}
                            </span>
                            {v.compareAtPrice != null && Number(v.compareAtPrice) > Number(v.price || 0) ? (
                              <span
                                className={`mt-0.5 text-[11px] tabular-nums line-through ${selected ? 'text-neutral-300' : 'text-neutral-400'}`}
                              >
                                {formatPrice(v.compareAtPrice, currency)}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                <div className={showVariantPicker ? 'mt-7 border-t border-neutral-100/80 pt-7' : ''}>
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Quantity</p>
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
                        id={`product-qty-mobile-card-${formFieldSuffix}`}
                        name="quantityMobileCard"
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
                    className={`btn-pdp-order-now relative z-0 flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[16px] font-bold tracking-tight shadow-md transition hover:shadow-lg disabled:opacity-90 disabled:pointer-events-none ${
                      orderNowVibrate && !orderNowNavigating ? 'animate-vibrate' : ''
                    }`}
                  >
                    {orderNowNavigating ? (
                      <>
                        <Spinner className="relative z-10 h-4 w-4 border-white/25 border-t-white" />
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
                  {reviewMediaReady && <PdpMobileReviewPeek reviews={mobileTopReviews} resolveImageUrl={resolveImageUrl} />}
                  <button
                    type="button"
                    disabled={orderNowNavigating || addCartMobileNavigating}
                    onClick={() => {
                      if (orderNowNavigating || addCartMobileNavigating) return;
                      void handleAddToCartMobile();
                      setAddCartVibrate(true);
                      setTimeout(() => setAddCartVibrate(false), 400);
                    }}
                    className={`w-full bg-transparent py-2 text-center text-[13px] font-semibold text-neutral-600 underline decoration-neutral-300 decoration-2 underline-offset-4 transition hover:text-neutral-900 hover:decoration-neutral-500 disabled:pointer-events-none disabled:opacity-40 ${
                      addCartVibrate ? 'animate-vibrate' : ''
                    }`}
                  >
                    {addCartMobileNavigating ? 'Going to checkout…' : 'Add to cart'}
                  </button>
                  <div className="ns-accent-glass flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-center text-[11px] font-semibold leading-snug text-neutral-800 sm:text-xs">
                    <span className="relative z-[1] flex items-center justify-center gap-2">
                      <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[rgb(var(--brand-gold-rgb)/0.35)]" aria-hidden />
                      Limited stock — reserve yours today
                    </span>
                  </div>
                </div>
              </div>
            )}
          </article>
        </div>

        <div className="col-span-full space-y-2 lg:hidden">
            {product.inventory === 0 ? (
              <div className="pt-0 sm:pt-0.5">
              <span className="mt-2 block rounded-xl border border-neutral-200 bg-neutral-100 py-2.5 text-center text-xs font-medium text-neutral-500 sm:mt-3 sm:py-3 sm:text-sm">
                  Out of stock
                </span>
              </div>
            ) : null}
        </div>
      </div>

      {storyBullets.length > 0 ? (
        <section className="mt-12 hidden border-t border-neutral-200 pt-12 lg:block" aria-labelledby="pdp-why-heading">
          <h2 id="pdp-why-heading" className="font-display text-xl font-semibold tracking-tight text-neutral-900 xl:text-2xl">
            Why customers choose this
          </h2>
          <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {storyBullets.map((text, i) => (
              <li key={`story-${i}`} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-50 text-sm font-bold text-gold-900 ring-1 ring-gold-200/60">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-neutral-600">{scrubMedicalTerms(text)}</p>
                </li>
              ))}
            </ul>
      </section>
      ) : null}

      {/* Product details: name, description, FAQs (mobile / tablet) */}
      <section className="mt-5 sm:mt-8 lg:mt-16 pt-5 sm:pt-8 lg:pt-12 border-t border-neutral-200 lg:hidden">
        <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 leading-snug tracking-tight">{productDisplayName}</h2>
        {customerRatingTrust && hasHelpsOrDescription ? (
          <div className="mt-4">
            <CustomerRatingsTrustCard count={customerRatingTrust.count} average={customerRatingTrust.average} />
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
        {disclaimerEnabled ? (
          <div className={(product.faq || []).length ? 'mt-5 sm:mt-6' : 'mt-5 sm:mt-8'}>
            <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50/90 px-3 py-2.5">
              <span className="min-w-0 text-[11px] sm:text-xs font-semibold text-neutral-900">{disclaimerTitleToShow}</span>
              <button
                type="button"
                onClick={() => setDisclaimerExpanded((v) => !v)}
                className="shrink-0 rounded-lg border border-neutral-200 bg-white px-3 py-1 text-[11px] sm:text-xs font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-50"
                aria-expanded={disclaimerExpanded}
                aria-controls="product-disclaimer-panel-mobile"
                id="product-disclaimer-toggle-mobile"
              >
                {disclaimerExpanded ? 'Hide' : 'View'}
              </button>
            </div>
            {disclaimerExpanded ? (
              <div
                id="product-disclaimer-panel-mobile"
                role="region"
                aria-labelledby="product-disclaimer-toggle-mobile"
                className="mt-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5"
              >
                <ul className="space-y-1 text-[11px] sm:text-sm text-neutral-700 leading-relaxed list-disc pl-4">
                  {disclaimerItemsToShow.map((item, idx) => (
                    <li key={`m-d-${idx}-${item.slice(0, 12)}`}>{scrubMedicalTerms(item)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="mt-4 sm:mt-6 rounded-xl sm:rounded-2xl bg-neutral-100 p-3 sm:p-4 text-xs sm:text-sm text-neutral-600 space-y-1.5 sm:space-y-2 leading-relaxed">
          <p><strong>Shipping:</strong> {SHIPPING_POLICY}</p>
          <p><strong>Returns:</strong> {RETURN_POLICY}</p>
        </div>
        {customProductBadges.length > 0 ? (
          <div className="mt-3 sm:mt-4 flex flex-wrap items-center" style={{ gap: 10 }}>
            {customProductBadges.map((b, idx) => {
              const src = resolveImageUrl(b.imageUrl);
              const alt = String(b.label || 'Badge').trim() || 'Badge';
              const bypassOpt = typeof src === 'string' && (src.startsWith('data:') || src.startsWith('blob:'));
              const img = src ? (
                <Image
                  src={src}
                  alt={alt}
                  width={124}
                  height={124}
                  className="h-[124px] w-[124px] object-contain"
                  loading="lazy"
                  sizes="124px"
                  unoptimized={bypassOpt}
                />
              ) : null;
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

      {/* Reviews: editorial header + ranked horizontal rail + write a review */}
      <section className="mt-6 sm:mt-10 lg:mt-16 xl:mt-20 pt-6 sm:pt-10 lg:pt-14 xl:pt-16 border-t border-neutral-200">
        <div className="mb-8 flex flex-col gap-6 lg:mb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h3 className="font-display text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl lg:text-4xl">Reviews</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 sm:text-base">
              Highlights from shoppers—prioritizing detailed write-ups, photos and video, and top ratings.
            </p>
          </div>
          {customerRatingTrust ? (
            <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-neutral-200/90 bg-gradient-to-br from-white to-neutral-50/90 px-5 py-4 shadow-sm ring-1 ring-black/[0.04]">
              <p className="font-display text-4xl font-bold tabular-nums leading-none text-neutral-900 sm:text-[2.75rem]">
                {(Math.round(customerRatingTrust.average * 10) / 10).toFixed(1)}
              </p>
              <div className="min-w-0">
                <ReviewStarsInline rating={customerRatingTrust.average} className="text-lg sm:text-xl" />
                <p className="mt-1.5 text-xs font-medium text-neutral-500 sm:text-sm">
                  {customerRatingTrust.count.toLocaleString()} reviews
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {reviewsRailList.length > 0 ? (
          <div className="relative mb-10 sm:mb-12 lg:mb-14">
            <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500 sm:text-[11px]">Featured reviews</h4>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-lg text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50"
                  aria-label="Scroll reviews left"
                  onClick={() => scrollReviewsRail(-1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-lg text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50"
                  aria-label="Scroll reviews right"
                  onClick={() => scrollReviewsRail(1)}
                >
                  ›
                </button>
              </div>
            </div>
            <div
              ref={reviewsRailRef}
              className="-mx-1 flex snap-x snap-mandatory scroll-smooth flex-nowrap gap-4 overflow-x-auto overflow-y-visible px-1 pb-4 pt-1 [scrollbar-width:thin] sm:gap-5 sm:px-0 lg:gap-6"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {(() => {
                let imgPrioLeft = 8;
                return reviewsRailList.map((r) => {
                  const media = normalizeReviewMediaItems(r);
                  const verified = !r.collection || r.collection === 'user';
                  return (
                <article
                      key={`rail-${r.id}`}
                      className="flex w-[min(90vw,19.5rem)] shrink-0 snap-start flex-col rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.03] sm:w-[22rem] sm:p-5 lg:w-[24rem]"
                    >
                      {media.length > 0 ? (
                        <div className="mb-4 space-y-2 overflow-hidden rounded-xl bg-neutral-100">
                          {media.slice(0, 2).map((m, mi) => {
                            const isImg = !mediaItemIsVideo(m) && !mediaItemIsAudio(m);
                            // eslint-disable-next-line no-plusplus
                            const prio = isImg && imgPrioLeft > 0 ? (imgPrioLeft--, true) : false;
                            return (
                        <ReviewMediaBlock
                                key={`${r.id}-rail-${mi}`}
                          item={m}
                          resolveImageUrl={resolveImageUrl}
                                priority={prio}
                        />
                            );
                          })}
                    </div>
                  ) : null}
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className={`${REVIEW_STAR_FILLED} text-[15px] tracking-[0.12em] sm:text-base`} aria-hidden>
                      {'★'.repeat(Math.min(5, r.rating || 0))}
                    </span>
                        <span className={`${REVIEW_STAR_EMPTY} text-[15px] tracking-[0.12em] sm:text-base`} aria-hidden>
                      {'★'.repeat(5 - Math.min(5, r.rating || 0))}
                    </span>
                        {verified ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900 ring-1 ring-emerald-200/80">
                            Verified
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/70">
                            Story
                          </span>
                        )}
                  </div>
                      <p className="text-xs font-semibold text-neutral-900 sm:text-sm">{r.authorName}</p>
                  {(() => {
                    const { quote, outcome } = splitReviewQuoteAndOutcome(r.body);
                    return (
                      <>
                            <p className="mt-2 line-clamp-6 text-sm leading-relaxed text-neutral-600 sm:line-clamp-5 sm:text-[15px] sm:leading-[1.65]">
                              {quote}
                            </p>
                        {outcome ? (
                              <p className="mt-3 text-xs font-semibold leading-snug text-emerald-900 sm:text-sm">Outcome: {outcome}</p>
                        ) : null}
                      </>
                    );
                  })()}
                </article>
                  );
                });
              })()}
            </div>
            {reviewsShowcaseRanked.length > 10 ? (
              <div className="mt-2 text-center sm:text-left">
                <button
                  type="button"
                  onClick={() => setReviewsExpanded((v) => !v)}
                  className="text-sm font-semibold text-neutral-900 underline decoration-neutral-300 decoration-2 underline-offset-4 transition hover:decoration-neutral-500"
                >
                  {reviewsExpanded
                    ? 'Show top 10 only'
                    : `See all ${reviewsShowcaseRanked.length} reviews in this list`}
                </button>
          </div>
        ) : null}
          </div>
        ) : null}

        <div className="rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-sm sm:p-6 lg:p-8 lg:shadow-premium">
            <p className="text-sm sm:text-base text-neutral-600 mb-4 sm:mb-5 leading-relaxed">
              Share your experience with this product.
            </p>
            <form onSubmit={handleSubmitReview} className="space-y-4 sm:space-y-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:gap-4">
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={`product-review-name-${formFieldSuffix}`}
                    className="mb-1 block text-xs font-medium text-neutral-700 sm:text-sm"
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
                    className="min-h-[44px] w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 transition-colors focus:border-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10 sm:min-h-0 sm:rounded-2xl sm:border-2 sm:border-neutral-600"
                  />
                </div>
                <div className="w-full sm:w-44 sm:flex-shrink-0 lg:w-48">
                  <label
                    htmlFor={`product-review-rating-${formFieldSuffix}`}
                    className="mb-1 block text-xs font-medium text-neutral-700 sm:text-sm"
                  >
                    Rating
                  </label>
                  <select
                    id={`product-review-rating-${formFieldSuffix}`}
                    name="rating"
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value) || 5)}
                    className="min-h-[44px] w-full cursor-pointer rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 shadow-sm transition-colors focus:border-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10 sm:min-h-0 sm:rounded-2xl sm:border-2 sm:border-neutral-600"
                  >
                    {[5, 4, 3, 2, 1].map((v) => (
                      <option key={v} value={v}>{`${v} star${v > 1 ? 's' : ''}`}</option>
                    ))}
                  </select>
                </div>
              </div>
            <div>
              <label
                htmlFor={`product-review-body-${formFieldSuffix}`}
                className="mb-1 block text-xs font-medium text-neutral-700 sm:text-sm"
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
                className="min-h-[7rem] w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 transition-colors focus:border-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10 sm:min-h-[6.5rem] sm:rounded-2xl sm:border-2 sm:border-neutral-600 lg:min-h-[7.5rem]"
              />
            </div>
            <div>
              <label
                htmlFor={`product-review-media-${formFieldSuffix}`}
                className="mb-2 block text-xs font-medium text-neutral-700 sm:text-sm"
              >
                Photos, video or audio (optional, max 4)
              </label>
              <input
                id={`product-review-media-${formFieldSuffix}`}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/aac"
                multiple
                onChange={onPickReviewMedia}
                className="block w-full cursor-pointer text-xs text-neutral-600 file:mr-3 file:inline-flex file:min-h-[44px] file:cursor-pointer file:items-center file:rounded-xl file:border-0 file:bg-neutral-900 file:px-4 file:py-2.5 file:text-xs file:font-semibold file:text-white file:shadow-sm file:transition-colors hover:file:bg-neutral-800 sm:text-sm"
              />
              {reviewFiles.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {reviewFiles.map((file, i) => (
                    <li
                      key={`${file.name}-${i}`}
                      className="flex max-w-full items-center gap-2 rounded-xl border border-neutral-200/80 bg-neutral-50 px-2.5 py-1.5 text-xs text-neutral-800"
                    >
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        className="shrink-0 rounded-lg px-1.5 py-0.5 text-xs font-medium text-red-700 hover:bg-red-50"
                        onClick={() => removeReviewFile(i)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {reviewMessage && (
              <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 sm:text-sm">
                {reviewMessage}
              </p>
            )}
            <button
              type="submit"
              disabled={reviewSubmitting || !reviewBody.trim()}
              aria-busy={reviewSubmitting}
              className="btn-gold-primary mt-1 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition duration-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-60 disabled:hover:shadow-none sm:w-auto sm:rounded-2xl"
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

      {/* Mobile: quick purchase bar (matches premium PDP) */}
      {product.inventory !== 0 && (
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200/70 bg-page-canvas/95 backdrop-blur-xl px-4 py-3.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.06)] pointer-events-none"
          role="region"
          aria-label="Quick purchase"
        >
          <div className="mx-auto max-w-xl flex items-center gap-2 sm:gap-3 pointer-events-auto">
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
              disabled={addCartMobileNavigating || orderNowNavigating}
              onClick={() => {
                if (addCartMobileNavigating || orderNowNavigating) return;
                void handleAddToCartMobile();
                setAddCartVibrate(true);
                setTimeout(() => setAddCartVibrate(false), 400);
              }}
              className={`shrink-0 rounded-full border border-neutral-900/20 bg-white px-3 py-2.5 text-[12px] font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-50 min-h-[3.25rem] disabled:opacity-60 disabled:pointer-events-none ${
                addCartVibrate ? 'animate-vibrate' : ''
              }`}
            >
              {addCartMobileNavigating ? (
                <span className="inline-flex items-center gap-1.5">
                  <Spinner className="h-3.5 w-3.5 border-neutral-400 border-t-neutral-900" />
                </span>
              ) : 'Add to cart'}
            </button>
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
              className={`btn-pdp-order-now relative z-0 min-h-[3.25rem] flex-1 min-w-0 rounded-full px-2.5 sm:px-3 text-[13px] sm:text-[14px] font-semibold tracking-tight transition hover:shadow-lg disabled:opacity-90 disabled:pointer-events-none ${
                orderNowVibrate && !orderNowNavigating ? 'animate-vibrate' : ''
              }`}
            >
              {orderNowNavigating ? (
                <span className="relative z-10 inline-flex items-center justify-center gap-2 text-[13px]">
                  <Spinner className="h-4 w-4 border-white/25 border-t-white" />
                  Please wait…
                </span>
              ) : (
                <span className="relative z-10">Order Now — COD</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Mobile: floating View Cart button — appears above sticky action bar when cart has items */}
      {cartTotalQty > 0 && product.inventory !== 0 && (
        <button
          type="button"
          onClick={openCart}
          className="lg:hidden fixed z-40 bottom-[5.5rem] right-4 flex items-center gap-2 rounded-full bg-neutral-900/95 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg backdrop-blur-sm"
          aria-label={`View cart — ${cartTotalQty} item${cartTotalQty !== 1 ? 's' : ''}`}
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          View Cart
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-neutral-900">
            {cartTotalQty}
          </span>
        </button>
      )}

      {/* Desktop: sticky bottom bar when purchase panel scrolls out */}
      {showStickyBar && product.inventory !== 0 && (
        <div
          className="max-lg:hidden flex fixed bottom-0 left-0 right-0 z-50 items-center justify-between gap-4 px-6 xl:px-10 py-3.5 xl:py-4 border-t border-neutral-200 bg-white/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
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
            <div className="flex items-center gap-3 flex-1 justify-end min-w-[280px]">
              <button
                type="button"
                disabled={orderNowNavigating}
                onClick={() => {
                  if (orderNowNavigating) return;
                  void handleAddToCart();
                  setAddCartVibrate(true);
                  setTimeout(() => setAddCartVibrate(false), 400);
                }}
                className={`rounded-full sm:rounded-2xl bg-neutral-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 transition shadow-md min-w-[108px] disabled:opacity-50 disabled:pointer-events-none ${
                  addCartVibrate ? 'animate-vibrate' : 'animate-cta-attract hover:animate-none'
                }`}
              >
                Add to cart
              </button>
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
                className={`rounded-full sm:rounded-2xl bg-neutral-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 transition shadow-md min-w-[92px] disabled:opacity-90 disabled:pointer-events-none ${
                  orderNowVibrate && !orderNowNavigating ? 'animate-vibrate' : ''
                }`}
              >
                <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
                  {orderNowNavigating ? (
                    <span aria-hidden>
                      <Spinner className="h-3.5 w-3.5 border-white/30 border-t-white" />
                    </span>
                  ) : null}
                  Buy now
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
