'use client';

import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect, useLayoutEffect, useRef, memo, Fragment } from 'react';
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
import { extractIntroParagraphsFromDescription, pickBestValueVariantId } from '@/lib/productDetailMobileParse';
import { ReviewMediaBlock, normalizeReviewMediaItems, mediaItemIsVideo, mediaItemIsAudio } from '@/components/review/ReviewMediaBlock';
import { canonicalVariantId } from '@/lib/cartLine';
import { InlineLoader, Spinner } from '@/components/ui/PageLoader';

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

const CustomerRatingsTrustCard = memo(function CustomerRatingsTrustCard({ count, average, className = '' }) {
  const safeCount = Number(count);
  const safeAvg = Number(average);
  if (!Number.isFinite(safeCount) || !Number.isFinite(safeAvg) || safeCount < 1 || safeAvg <= 0) return null;
  const display = Math.round(safeAvg * 10) / 10;
  const fullStars = Math.min(5, Math.max(0, Math.round(safeAvg)));
  const label =
    safeCount === 1 ? 'Based on 1 customer rating' : `Based on ${safeCount.toLocaleString('en-US')} customer ratings`;
  return (
    <div
      className={`ns-trust-glass rounded-xl px-4 py-3.5 sm:px-5 sm:py-4 ${className}`}
      role="region"
      aria-label={`Average ${display} out of 5 stars. ${label}.`}
    >
      <div className="relative z-[1]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-900">Customer trust</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-3 sm:gap-4">
          <p className="font-display text-[2rem] font-bold tabular-nums leading-none text-neutral-900 sm:text-[2.125rem]">{display.toFixed(1)}</p>
          <div className="min-w-0 flex-1">
            <p className="text-lg leading-none tracking-tight sm:text-xl" aria-hidden>
              <span className="text-amber-500">{'★'.repeat(fullStars)}</span>
              <span className="text-neutral-900/28">{'★'.repeat(5 - fullStars)}</span>
            </p>
            <p className="mt-1.5 text-[12px] font-medium leading-snug text-neutral-900 sm:text-[13px]">
              <span className="font-semibold">Average {display.toFixed(1)} out of 5</span>
              {' · '}
              {label}
            </p>
          </div>
        </div>
      </div>
    </div>
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

/** Web (lg+): infinite horizontal marquee; duplicate lane for seamless -50% translate. */
function PdpReviewsMarqueeRow({ items, ariaLabel, renderItem }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-neutral-200/70 bg-gradient-to-b from-white to-neutral-50/40 py-3 shadow-sm motion-reduce:overflow-x-auto [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)] motion-reduce:[mask-image:none]"
      role="region"
      aria-label={ariaLabel}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-8 bg-gradient-to-r from-white to-transparent lg:w-10" aria-hidden />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-8 bg-gradient-to-l from-white to-transparent lg:w-10" aria-hidden />
      <div className="flex w-max animate-pdp-reviews-marquee motion-reduce:animate-none will-change-transform group-hover:[animation-play-state:paused]">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex shrink-0 gap-4 pr-4">
            {items.map((r) => (
              <Fragment key={`${dup}-${r.id}`}>{renderItem(r)}</Fragment>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const PdpCustomerStoryCard = memo(function PdpCustomerStoryCard({ review: r, resolveImageUrl, imagePriority }) {
  const liveMedia = normalizeReviewMediaItems(r);
  let imgPrioLeft = imagePriority ? 5 : 0;
  const { quote, outcome } = splitReviewQuoteAndOutcome(r.body);
  return (
    <article className="w-[min(18rem,calc(100vw-4rem))] shrink-0 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm ring-1 ring-black/[0.03] sm:w-72 sm:p-5 lg:w-80 lg:p-4">
      {liveMedia.length > 0 ? (
        <div className="mb-2 space-y-2">
          {liveMedia.map((m, i) => {
            const isImg = !mediaItemIsVideo(m) && !mediaItemIsAudio(m);
            // eslint-disable-next-line no-plusplus
            const prio = isImg && imgPrioLeft > 0 ? (imgPrioLeft--, true) : false;
            return (
              <ReviewMediaBlock
                key={`${r.id}-story-${i}-${m.url?.slice?.(0, 20) || i}`}
                item={m}
                resolveImageUrl={resolveImageUrl}
                priority={prio}
              />
            );
          })}
        </div>
      ) : null}
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className={`${REVIEW_STAR_FILLED} text-sm tracking-[0.08em]`} aria-hidden>
          {'★'.repeat(Math.min(5, r.rating || 0))}
        </span>
        <span className={`${REVIEW_STAR_EMPTY} text-sm tracking-[0.08em]`} aria-hidden>
          {'★'.repeat(5 - Math.min(5, r.rating || 0))}
        </span>
        <span className="truncate text-xs font-semibold text-neutral-900">{r.authorName}</span>
      </div>
      {quote ? <p className="line-clamp-4 text-xs leading-relaxed text-neutral-600">{quote}</p> : null}
      {outcome ? (
        <p className="mt-1.5 line-clamp-2 border-t border-neutral-100 pt-1.5 text-[11px] font-semibold leading-snug text-emerald-900">
          Outcome: {outcome}
        </p>
      ) : null}
    </article>
  );
});

const PdpRecentReviewMarqueeCard = memo(function PdpRecentReviewMarqueeCard({ review: r, resolveImageUrl }) {
  const recentMedia = normalizeReviewMediaItems(r);
  const { quote, outcome } = splitReviewQuoteAndOutcome(r.body);
  return (
    <article className="w-[min(18rem,calc(100vw-4rem))] shrink-0 rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-4 shadow-sm ring-1 ring-black/[0.02] sm:w-72 lg:w-80">
      {recentMedia.length > 0 ? (
        <div className="mb-2 space-y-2">
          {recentMedia.map((m, mi) => (
            <ReviewMediaBlock key={`${r.id}-marq-${mi}`} item={m} resolveImageUrl={resolveImageUrl} priority={false} />
          ))}
        </div>
      ) : null}
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className={`${REVIEW_STAR_FILLED} text-sm tracking-[0.08em]`} aria-hidden>
          {'★'.repeat(Math.min(5, r.rating || 0))}
        </span>
        <span className={`${REVIEW_STAR_EMPTY} text-sm tracking-[0.08em]`} aria-hidden>
          {'★'.repeat(5 - Math.min(5, r.rating || 0))}
        </span>
        <span className="truncate text-sm font-semibold text-neutral-900">{r.authorName}</span>
      </div>
      {quote ? <p className="line-clamp-4 text-sm leading-relaxed text-neutral-600">{quote}</p> : null}
      {outcome ? (
        <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-snug text-emerald-900 sm:text-sm">Outcome: {outcome}</p>
      ) : null}
    </article>
  );
});

function PdpMobileReviewPeek({ reviews, resolveImageUrl }) {
  if (!Array.isArray(reviews) || reviews.length === 0) return null;
  return (
    <div className="mt-4 border-t border-neutral-100 pt-4" aria-label="Recent buyer reviews">
      <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">What buyers say</p>
      <ul className="space-y-2.5">
        {(() => {
          let imgPrioLeft = 5;
          return reviews.map((r) => {
          const { quote, outcome } = splitReviewQuoteAndOutcome(r.body);
          const mediaItems = normalizeReviewMediaItems(r);
          return (
            <li key={r.id} className="rounded-xl border border-neutral-100 bg-neutral-50/90 px-3 py-2.5">
              {mediaItems.length > 0 ? (
                <div className="mb-2 space-y-2">
                  {mediaItems.map((m, mi) => {
                    const isImg = !mediaItemIsVideo(m) && !mediaItemIsAudio(m);
                    // eslint-disable-next-line no-plusplus
                    const prio = isImg && imgPrioLeft > 0 ? (imgPrioLeft--, true) : false;
                    return (
                    <ReviewMediaBlock
                      key={`${r.id}-peek-${mi}-${m.url?.slice?.(0, 20) || mi}`}
                      item={m}
                      resolveImageUrl={resolveImageUrl}
                      priority={prio}
                    />
                    );
                  })}
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
          });
        })()}
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
  /** Desktop PDP: single open accordion id (`faq-0`, `details`, `shipping`, `disclaimer`). */
  const [webAccordion, setWebAccordion] = useState(null);
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
  const categoryCrumb = product?.category;
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
  const reviewPreviewCount = isLg ? 2 : 3;
  const visibleReviews = primaryReviews
    ? (reviewsExpanded ? primaryReviews : primaryReviews.slice(0, reviewPreviewCount))
    : [];
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
          const prevQty = beforeRow?.qty ?? 0;
          useCartStore.getState().addItem(line);
          const afterRow = useCartStore.getState().items.find(
            (i) => i.productId === line.productId && String(i.variantId ?? '') === vk
          );
          const delta = (afterRow?.qty ?? 0) - prevQty;
          if (delta > 0) trackAddToCart(p, line.price / 100, delta, ctx.currency);
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

  return (
    <div
      className={`mx-auto max-w-7xl px-3 sm:px-5 lg:px-8 xl:px-10 py-3 sm:py-5 lg:py-7 xl:py-8 lg:bg-[linear-gradient(180deg,#f7f6f4_0%,#ffffff_18%)] ${
        showStickyBar ? 'lg:pb-24 xl:pb-28' : ''
      } ${product.inventory !== 0 ? 'max-lg:pb-28' : ''}`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-7 xl:gap-x-9 max-lg:gap-y-3 sm:max-lg:gap-y-4 animate-slide-up items-start">
        {/* Left: gallery — mobile: hero + horizontal thumbs; desktop: vertical thumbs + hero (reference-style) */}
        <div className="relative mx-auto w-full lg:col-span-7 lg:mx-0 lg:max-w-none">
          <div className="flex flex-col gap-2.5 max-lg:rounded-xl max-lg:border max-lg:border-neutral-200 max-lg:bg-neutral-50 max-lg:p-1.5 sm:gap-3 sm:max-lg:p-2 lg:flex-row lg:items-start lg:gap-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
            <div
              className="relative w-full shrink-0 overflow-hidden rounded-lg sm:rounded-xl max-lg:rounded-[1.1rem] max-lg:border max-lg:border-white/90 max-lg:bg-neutral-50 max-lg:shadow-lift max-lg:ring-neutral-900/[0.04] max-lg:frame-media-inset lg:order-2 lg:min-w-0 lg:flex-1 lg:rounded-xl lg:border lg:border-neutral-200/60 lg:bg-gradient-to-br lg:from-white lg:to-neutral-100/90 lg:p-2 lg:shadow-[0_16px_44px_-24px_rgba(15,15,15,0.14)] lg:ring-1 lg:ring-neutral-900/[0.05]"
              onMouseEnter={() => setZoom(true)}
              onMouseLeave={() => setZoom(false)}
            >
              {pctOff != null && pctOff > 0 ? (
                <span className="absolute left-3 top-3 z-20 rounded-full border border-rose-200/80 bg-gradient-to-br from-rose-50 to-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-900 shadow-sm sm:left-4 sm:top-4 lg:left-3 lg:top-3">
                  {pctOff}% off
                </span>
              ) : null}
              <div className="relative isolate h-0 w-full pb-[125%] lg:pb-[100%]">
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
                    onClick={() =>
                      setSelectedImageIndex((idx) =>
                        (idx - 1 + variantImageList.length) % variantImageList.length,
                      )
                    }
                    className="max-lg:hidden absolute left-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200/90 bg-white/95 text-neutral-800 shadow-md transition hover:bg-white"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label="Next image"
                    onClick={() => setSelectedImageIndex((idx) => (idx + 1) % variantImageList.length)}
                    className="max-lg:hidden absolute right-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200/90 bg-white/95 text-neutral-800 shadow-md transition hover:bg-white"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={handleWishlistToggle}
                className="absolute right-3 top-3 z-30 rounded-full border border-neutral-200/80 bg-white/95 p-2.5 shadow-sm backdrop-blur-sm transition hover:border-neutral-400 lg:z-10 lg:bg-white/90 lg:shadow-md lg:hover:bg-white lg:hover:shadow-lg"
                aria-label="Wishlist"
              >
                <svg className="h-5 w-5 text-neutral-700" fill={wishlist.includes(product.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </button>
            </div>
            <div className="mt-1.5 flex w-full flex-row flex-nowrap items-center justify-start gap-2 overflow-x-auto overflow-y-visible pb-0.5 [scrollbar-width:thin] sm:mt-2.5 sm:gap-2.5 sm:pb-1 lg:order-1 lg:mt-0 lg:w-[4.25rem] lg:max-h-[min(560px,72vh)] lg:shrink-0 lg:flex-col lg:items-stretch lg:justify-start lg:gap-2 lg:overflow-y-auto lg:overflow-x-visible lg:pb-0 lg:pr-0.5">
              {variantImageList.map((url, i) => {
                const resolved = resolveImageUrl(url);
                return resolved ? (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedImageIndex(i)}
                    className={`relative flex h-[3.75rem] w-[3.75rem] shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 sm:h-16 sm:w-16 sm:rounded-xl lg:h-[3.35rem] lg:w-full lg:max-w-[4.25rem] lg:rounded-md lg:bg-white/90 lg:shadow-sm ${
                      selectedImageIndex === i
                        ? 'border-neutral-900 ring-2 ring-neutral-900/15 ring-offset-2 ring-offset-white'
                        : 'border-neutral-200/90 lg:border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    <Image
                      src={resolved}
                      alt={`${productDisplayName} ${i + 1}`}
                      width={80}
                      height={80}
                      className="h-full w-full object-contain"
                      sizes="(max-width: 1023px) 72px, 64px"
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
            </div>
            {introParagraphs.length > 0 ? (
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
                  <PdpMobileReviewPeek reviews={mobileTopReviews} resolveImageUrl={resolveImageUrl} />
                  <button
                    type="button"
                    disabled={orderNowNavigating}
                    onClick={() => {
                      if (orderNowNavigating) return;
                      void handleAddToCart();
                      setAddCartVibrate(true);
                      setTimeout(() => setAddCartVibrate(false), 400);
                    }}
                    className={`w-full bg-transparent py-2 text-center text-[13px] font-semibold text-neutral-600 underline decoration-neutral-300 decoration-2 underline-offset-4 transition hover:text-neutral-900 hover:decoration-neutral-500 disabled:pointer-events-none disabled:opacity-40 ${
                      addCartVibrate ? 'animate-vibrate' : ''
                    }`}
                  >
                    Add to cart
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

        <div className="min-w-0 space-y-2 sm:space-y-3 lg:space-y-3 lg:col-span-5">
          {/* Desktop (lg+): compact sales rail — FAQ + policies inside sticky card */}
          <div
            ref={purchasePanelRef}
            className="max-lg:hidden block space-y-3 xl:space-y-3.5 pb-6 lg:pb-0 rounded-2xl lg:rounded-xl lg:border lg:border-neutral-200/80 lg:bg-white lg:p-5 xl:p-6 lg:shadow-[0_12px_40px_-18px_rgba(15,23,42,0.1)] lg:ring-1 lg:ring-neutral-900/[0.04] lg:sticky lg:top-24 xl:top-28 lg:self-start"
          >
            <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400" aria-label="Breadcrumb">
              <Link href="/shop" className="transition hover:text-neutral-700">
                Shop
              </Link>
              {categoryCrumb?.slug ? (
                <>
                  <span className="text-neutral-300" aria-hidden>
                    /
                  </span>
                  <Link href={`/shop?category=${encodeURIComponent(categoryCrumb.slug)}`} className="max-w-[10rem] truncate transition hover:text-neutral-700">
                    {categoryCrumb.name || 'Category'}
                  </Link>
                </>
              ) : null}
            </nav>
            <h1 className="font-display text-[1.65rem] font-semibold leading-[1.08] tracking-tight text-neutral-900 xl:text-[1.85rem]">
              {productDisplayName}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <ProductRatingSummary
                product={product}
                starClassName="text-sm leading-none"
                countClassName="text-xs text-neutral-500"
                className="flex flex-wrap items-center gap-x-1"
              />
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <p className="text-xl font-bold tabular-nums tracking-tight text-neutral-900 xl:text-2xl">
                {(product.variants?.length > 1 ? variant?.compareAtPrice : product.compareAtPrice) && (
                  <span className="mr-2 text-base font-medium text-neutral-400 line-through xl:text-lg">
                    {formatPrice(product.variants?.length > 1 ? variant?.compareAtPrice : product.compareAtPrice, currency)}
                  </span>
                )}
                {formatPrice(price, currency)}
              </p>
              {pctOff != null && pctOff > 0 ? (
                <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                  Save {pctOff}%
                </span>
              ) : null}
            </div>
            {introParagraphs.length > 0 ? (
              <p className="text-[13px] leading-relaxed text-neutral-600 line-clamp-4">{scrubMedicalTerms(introParagraphs[0])}</p>
            ) : null}
            {customerRatingTrust ? (
              <div>
                <CustomerRatingsTrustCard
                  count={customerRatingTrust.count}
                  average={customerRatingTrust.average}
                  className="lg:!rounded-lg lg:!px-3 lg:!py-2.5"
                />
              </div>
            ) : null}
            {product.inventory !== 0 ? (
              <div>
                <ProductTrustBar product={product} variant="pills" className="lg:gap-1.5" />
              </div>
            ) : null}
            <div className="h-px w-full bg-neutral-100" aria-hidden />
            <div>
              <div className="flex flex-wrap items-start gap-3">
                {product.variants?.length === 1 ? (
                  <div className="min-w-0 flex-1">
                    <p className="mb-2 text-[11px] font-semibold tracking-wide text-neutral-800">Size</p>
                    <span className="inline-flex rounded-lg border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
                      {product.variants[0].name}
                    </span>
                  </div>
                ) : product.variants?.length > 1 ? (
                  <div className="min-w-0 flex-1">
                    <p className="mb-2 text-[11px] font-semibold tracking-wide text-neutral-800">Size</p>
                    <div className="flex flex-wrap gap-1.5">
                      {product.variants.map((v) => {
                        const sel = variant?.id === v.id;
                        const showStrike = v.compareAtPrice != null && Number(v.compareAtPrice) > Number(v.price || 0);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setSelectedVariant(v)}
                            className={`min-w-[4.75rem] rounded-lg border px-3 py-2 text-left text-[13px] font-medium transition duration-200 lg:min-w-[5rem] ${
                              sel
                                ? 'border-neutral-900 bg-neutral-900 text-white shadow-md ring-1 ring-neutral-900/15 ring-offset-1 ring-offset-white'
                                : 'border-neutral-200/90 bg-neutral-50/80 text-neutral-800 shadow-sm hover:border-neutral-400 hover:bg-white hover:shadow'
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
              </div>
            </div>
            {product.inventory === 0 ? (
              <span className="rounded-xl border border-neutral-200 bg-neutral-100 py-2.5 text-center text-sm font-medium text-neutral-500">
                Out of stock
              </span>
            ) : (
              <>
                <div className="flex items-stretch gap-2 pt-1">
                  <div className="inline-flex shrink-0 items-stretch overflow-hidden rounded-lg border border-neutral-900/20 bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => setQty((n) => Math.max(1, (n || 1) - 1))}
                      className="flex h-11 w-10 items-center justify-center text-lg leading-none text-neutral-700 transition hover:bg-neutral-50"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <div className="flex min-w-[2.75rem] items-center justify-center border-x border-neutral-200 bg-neutral-50/50 px-1">
                      <input
                        id={`product-qty-${formFieldSuffix}`}
                        name="quantity"
                        type="number"
                        min={1}
                        max={99}
                        value={effectiveQty}
                        onChange={(e) => setQty(Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1)))}
                        className="m-0 h-11 w-full min-w-0 border-0 bg-transparent p-0 text-center text-sm font-semibold tabular-nums text-neutral-900 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setQty((n) => Math.min(99, (n || 1) + 1))}
                      className="flex h-11 w-10 items-center justify-center text-lg leading-none text-neutral-700 transition hover:bg-neutral-50"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
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
                    className={`min-h-[2.75rem] flex-1 rounded-lg border-2 border-neutral-900 bg-neutral-100 px-4 text-center text-[12px] font-bold uppercase tracking-[0.06em] text-neutral-900 shadow-sm transition hover:bg-neutral-200 disabled:pointer-events-none disabled:opacity-50 ${
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
                  className={`btn-pdp-order-now relative z-0 w-full rounded-lg py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] text-white shadow-md transition hover:shadow-lg disabled:opacity-90 disabled:pointer-events-none ${
                    orderNowVibrate && !orderNowNavigating ? 'animate-vibrate' : ''
                  }`}
                >
                  <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
                    {orderNowNavigating ? (
                      <span aria-hidden>
                        <Spinner className="h-3.5 w-3.5 border-white/30 border-t-white" />
                      </span>
                    ) : null}
                    Order now — cash on delivery
                  </span>
                </button>
              </>
            )}
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gold-800">
              <svg className="h-3.5 w-3.5 shrink-0 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1h-1m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
              Free shipping
            </p>

            <div className="mt-4 border-t border-neutral-200 pt-1">
              {product.description ? (
                <div className="border-b border-neutral-100">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-neutral-900"
                    aria-expanded={webAccordion === 'details'}
                    onClick={() => setWebAccordion(webAccordion === 'details' ? null : 'details')}
                  >
                    <span>Product details</span>
                    <span className="text-lg leading-none text-neutral-400 tabular-nums">{webAccordion === 'details' ? '−' : '+'}</span>
                  </button>
                  {webAccordion === 'details' ? (
                    <div
                      id="product-details-lg"
                      className="product-description pb-4 text-[13px] leading-relaxed text-neutral-600 [&_li]:my-0.5 [&_p]:mb-2 [&_ul]:my-2"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(scrubMedicalTerms(product.description)) }}
                    />
                  ) : null}
                </div>
              ) : null}
              {(product.faq || []).map((item, i) => {
                const accKey = `faq-${i}`;
                return (
                  <div key={accKey} className="border-b border-neutral-100">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-neutral-900"
                      aria-expanded={webAccordion === accKey}
                      onClick={() => setWebAccordion(webAccordion === accKey ? null : accKey)}
                    >
                      <span className="min-w-0 pr-2">{scrubMedicalTerms(item.q)}</span>
                      <span className="shrink-0 text-lg leading-none text-neutral-400 tabular-nums">
                        {webAccordion === accKey ? '−' : '+'}
                      </span>
                    </button>
                    {webAccordion === accKey ? (
                      <p className="pb-4 text-[13px] leading-relaxed text-neutral-600">{scrubMedicalTerms(item.a)}</p>
                    ) : null}
                  </div>
                );
              })}
              <div className="border-b border-neutral-100">
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-neutral-900"
                  aria-expanded={webAccordion === 'shipping'}
                  onClick={() => setWebAccordion(webAccordion === 'shipping' ? null : 'shipping')}
                >
                  <span>Shipping & returns</span>
                  <span className="text-lg leading-none text-neutral-400 tabular-nums">{webAccordion === 'shipping' ? '−' : '+'}</span>
                </button>
                {webAccordion === 'shipping' ? (
                  <div className="space-y-2 pb-4 text-[13px] leading-relaxed text-neutral-600">
                    <p>
                      <strong className="text-neutral-800">Shipping:</strong> {SHIPPING_POLICY}
                    </p>
                    <p>
                      <strong className="text-neutral-800">Returns:</strong> {RETURN_POLICY}
                    </p>
                  </div>
                ) : null}
              </div>
              {disclaimerEnabled ? (
                <div className="border-b border-neutral-100">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-neutral-900"
                    aria-expanded={webAccordion === 'disclaimer'}
                    onClick={() => setWebAccordion(webAccordion === 'disclaimer' ? null : 'disclaimer')}
                  >
                    <span className="min-w-0 pr-2">{disclaimerTitleToShow}</span>
                    <span className="shrink-0 text-lg leading-none text-neutral-400 tabular-nums">
                      {webAccordion === 'disclaimer' ? '−' : '+'}
                    </span>
                  </button>
                  {webAccordion === 'disclaimer' ? (
                    <ul className="list-disc space-y-1 pb-4 pl-4 text-[12px] leading-relaxed text-neutral-700">
                      {disclaimerItemsToShow.map((item, idx) => (
                        <li key={`d-acc-${idx}-${item.slice(0, 12)}`}>{scrubMedicalTerms(item)}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
            {customProductBadges.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center" style={{ gap: 10 }}>
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
                    <a key={`badge-rail-${idx}`} href={b.href} target="_blank" rel="noopener noreferrer" className="shrink-0 hover:opacity-90">
                      {img}
                    </a>
                  ) : (
                    <span key={`badge-rail-${idx}`} className="shrink-0">
                      {img}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Mobile / tablet: out of stock only (trust + shipping live in purchase card) */}
          <div className="space-y-2 lg:hidden">
            {product.inventory === 0 ? (
              <div className="pt-0 sm:pt-0.5">
                <span className="mt-2 sm:mt-3 block rounded-xl border border-neutral-200 bg-neutral-100 py-2.5 sm:py-3 text-center text-xs sm:text-sm font-medium text-neutral-500">
                  Out of stock
                </span>
              </div>
            ) : null}
          </div>
        </div>

      </div>

      {/* Product details: name, description, FAQs (mobile / tablet) */}
      <section className="mt-5 sm:mt-8 lg:mt-16 pt-5 sm:pt-8 lg:pt-12 border-t border-neutral-200 lg:hidden">
        <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 leading-snug tracking-tight">{productDisplayName}</h2>
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

      {/* Write review + recent reviews */}
      <section className="mt-6 sm:mt-10 border-t border-neutral-200 pt-6 sm:pt-10 lg:mt-8 lg:pt-8 xl:mx-auto xl:max-w-6xl xl:mt-10 xl:pt-10">
        <h3 className="mb-6 font-display text-xl tracking-tight text-neutral-900 sm:mb-8 sm:text-2xl lg:mb-5 lg:text-2xl xl:text-[1.65rem]">
          Reviews
        </h3>
        {liveReviewsList.length > 0 ? (
          <div className="mb-8 sm:mb-10 lg:mb-6">
            <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-gold-700/90 sm:text-[11px]">
              Customer stories
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:hidden">
              {liveReviewsList.map((r, idx) => (
                <PdpCustomerStoryCard
                  key={r.id}
                  review={r}
                  resolveImageUrl={resolveImageUrl}
                  imagePriority={idx < 2}
                />
              ))}
            </div>
            <div className="hidden lg:block">
              <PdpReviewsMarqueeRow
                items={liveReviewsList}
                ariaLabel="Customer stories"
                renderItem={(r) => <PdpCustomerStoryCard review={r} resolveImageUrl={resolveImageUrl} imagePriority={false} />}
              />
            </div>
          </div>
        ) : null}
        <div className="rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-sm sm:p-6 lg:p-6 lg:shadow-sm">
          <div className="flex flex-col gap-8">
          <div>
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
          <div className="min-w-0 border-t border-neutral-200/80 pt-8 lg:pt-6">
            {primaryReviews && primaryReviews.length > 0 ? (
              <>
                <h4 className="mb-3 text-base font-semibold tracking-tight text-neutral-900 sm:mb-2 sm:text-lg lg:mb-2">
                  Recent reviews{fiveStarReviews.length > 0 ? ' (5-star highlights)' : ''}
                </h4>
                <div className="space-y-4 sm:space-y-5 lg:hidden">
                  {visibleReviews.map((r) => {
                    const recentMedia = normalizeReviewMediaItems(r);
                    return (
                      <div
                        key={r.id}
                        className="rounded-2xl border border-neutral-200/80 bg-neutral-50/40 p-4 shadow-sm ring-1 ring-black/[0.02] sm:p-5"
                      >
                        {recentMedia.length > 0 ? (
                          <div className="mb-3 space-y-2">
                            {recentMedia.map((m, mi) => (
                              <ReviewMediaBlock
                                key={`${r.id}-um-${mi}`}
                                item={m}
                                resolveImageUrl={resolveImageUrl}
                              />
                            ))}
                          </div>
                        ) : null}
                        <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-2.5">
                          <span
                            className={`${REVIEW_STAR_FILLED} text-base sm:text-lg tracking-[0.08em]`}
                            aria-hidden
                          >
                            {'★'.repeat(Math.min(5, r.rating || 0))}
                          </span>
                          <span
                            className={`${REVIEW_STAR_EMPTY} text-base sm:text-lg tracking-[0.08em]`}
                            aria-hidden
                          >
                            {'★'.repeat(5 - Math.min(5, r.rating || 0))}
                          </span>
                          <span className="text-sm font-semibold text-neutral-900">{r.authorName}</span>
                        </div>
                        {(() => {
                          const { quote, outcome } = splitReviewQuoteAndOutcome(r.body);
                          return (
                            <>
                              <p className="text-sm leading-relaxed text-neutral-600 sm:text-[15px] sm:leading-[1.65]">{quote}</p>
                              {outcome ? (
                                <p className="mt-2 text-sm font-semibold leading-snug text-emerald-900 sm:text-[15px]">
                                  Outcome: {outcome}
                                </p>
                              ) : null}
                            </>
                          );
                        })()}
                      </div>
                    );
                  })}
                  {primaryReviews.length > reviewPreviewCount ? (
                    <button
                      type="button"
                      onClick={() => setReviewsExpanded((v) => !v)}
                      className="border-b border-neutral-300 pb-0.5 text-sm font-medium text-neutral-900 hover:text-neutral-700"
                    >
                      {reviewsExpanded
                        ? 'View less'
                        : `View more reviews (${primaryReviews.length - reviewPreviewCount} more)`}
                    </button>
                  ) : null}
                </div>
                <div className="hidden lg:block">
                  <PdpReviewsMarqueeRow
                    items={primaryReviews}
                    ariaLabel="Recent reviews"
                    renderItem={(r) => <PdpRecentReviewMarqueeCard review={r} resolveImageUrl={resolveImageUrl} />}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-neutral-500 sm:text-base">
                {liveReviewsList.length > 0
                  ? 'No community reviews yet. Be the first to leave one.'
                  : 'No reviews yet. Be the first to review this product.'}
              </p>
            )}
          </div>
        </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-6 border-t border-neutral-200 pt-6 sm:mt-12 sm:pt-10 lg:mt-10 lg:pt-8 xl:mt-12 xl:pt-10">
          <h2 className="mb-3 text-lg font-semibold tracking-tight text-neutral-900 sm:mb-6 sm:text-xl lg:mb-5 lg:text-xl xl:text-[1.35rem]">
            You may also like
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:gap-5 xl:gap-6">
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
                  <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug text-neutral-900 sm:mt-3 sm:text-sm lg:mt-2 lg:text-sm xl:text-base">
                    {name}
                  </p>
                  <p className="mt-0.5 text-[11px] tabular-nums text-neutral-500 sm:text-sm lg:mt-0.5 lg:text-sm xl:text-base">
                    {formatPrice(p.price, currency)}
                  </p>
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
              onClick={() => {
                void handleAddToCart();
                setAddCartVibrate(true);
                setTimeout(() => setAddCartVibrate(false), 400);
              }}
              className={`shrink-0 rounded-full border border-neutral-900/20 bg-white px-3 py-2.5 text-[12px] font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-50 min-h-[3.25rem] ${
                addCartVibrate ? 'animate-vibrate' : ''
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
