'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import Link from '@/components/Link';
import Image from 'next/image';
import { useProductsStore, useCartStore, useCartOpenStore, useWishlistStore, useCurrencyStore } from '@/lib/store';
import { useBreadcrumbLabel } from '@/lib/BreadcrumbContext';
import { SHIPPING_POLICY, RETURN_POLICY } from '@/lib/constants';
import { trackViewContent, trackAddToCart, trackOutOfStockView } from '@/lib/analytics';
import { formatPrice } from '@/lib/currency';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { getProductById, getProductBySlug, resolveImageUrl, getReviews, submitReview, productPath } from '@/lib/api';
import { InlineLoader } from '@/components/ui/PageLoader';

const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export default function ProductPage() {
  const params = useParams();
  const slugOrId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const storeProducts = useProductsStore((s) => s.products);
  const [apiProduct, setApiProduct] = useState(null);
  const [productLoading, setProductLoading] = useState(!!slugOrId);

  useEffect(() => {
    if (!slugOrId) {
      setProductLoading(false);
      return;
    }
    const fetchProduct = isUuid(slugOrId) ? getProductById(slugOrId) : getProductBySlug(slugOrId);
    fetchProduct
      .then((p) => { setApiProduct(p); })
      .catch(() => { setApiProduct(null); })
      .finally(() => setProductLoading(false));
  }, [slugOrId]);

  const productFromStore = useMemo(
    () => (slugOrId ? storeProducts.find((p) => p.id === slugOrId || (p.slug && p.slug === slugOrId)) : null),
    [storeProducts, slugOrId]
  );
  const product = apiProduct ?? productFromStore;
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
  const [reviews, setReviews] = useState([]);
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

  const variant = selectedVariant ?? defaultVariant ?? product?.variants?.[0];
  const variantImageList = (variant?.images && variant.images.length) ? variant.images : (variant?.image ? [variant.image] : product?.images || []);
  useEffect(() => { setSelectedImageIndex(0); }, [variant?.id]);
  useEffect(() => { setQty(1); }, [variant?.id]);
  const rawMain = variantImageList[selectedImageIndex] || variantImageList[0] || product?.images?.[0] || '';
  const mainImage = resolveImageUrl(rawMain) || '/assets/nature-secret-logo.svg';
  const price = variant?.price ?? product?.price;
  const isApiImage = !!rawMain && (rawMain.startsWith('/') || rawMain.includes('/api/'));
  const productDisplayName = product?.name ?? product?.slug ?? 'Product';
  const currency = useCurrencyStore((s) => s.currency);

  useEffect(() => {
    if (product) {
      trackViewContent(product.id, product.name, product.price / 100);
      if ((product.inventory ?? 0) === 0) trackOutOfStockView(product.id);
    }
  }, [product]);

  useEffect(() => {
    if (!product?.id) return;
    getReviews(product.id).then(setReviews).catch(() => setReviews([]));
  }, [product?.id]);

  const addToCart = useCartStore((s) => s.addItem);
  const openCart = useCartOpenStore((s) => s.open);
  const wishlist = useWishlistStore((s) => s.productIds);
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const { setLastSegmentLabel } = useBreadcrumbLabel() || {};

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

  const fiveStarReviews = useMemo(
    () => (Array.isArray(reviews) ? reviews.filter((r) => (r.rating || 0) >= 5) : []),
    [reviews]
  );
  const primaryReviews = fiveStarReviews.length > 0 ? fiveStarReviews : reviews;
  const visibleReviews = primaryReviews
    ? (reviewsExpanded ? primaryReviews : primaryReviews.slice(0, 3))
    : [];

  if (productLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4">
        <InlineLoader />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-16 text-center">
        <p className="text-neutral-600">This product isn&apos;t available or the catalog is updating. Try again later or browse the shop.</p>
        <Link href="/shop" className="mt-4 inline-block text-sm font-medium text-gold-700 hover:text-gold-600 border-b border-gold-500/40 pb-0.5">Back to shop</Link>
      </div>
    );
  }

  const effectiveQty = Math.max(1, Math.min(99, Number(qty) || 1));

  function handleAddToCart() {
    if (!variant) return;
    addToCart({
      productId: product.id,
      variantId: variant.id,
      price: variant.price,
      name: product.name,
      image: (variant.images && variant.images[0]) || variant.image || product.images?.[0],
      qty: effectiveQty,
    });
    openCart();
    trackAddToCart(product.id, product.name, variant.price / 100, effectiveQty);
  }

  function handleOrderNow() {
    if (!variant) return;
    addToCart({
      productId: product.id,
      variantId: variant.id,
      price: variant.price,
      name: product.name,
      image: (variant.images && variant.images[0]) || variant.image || product.images?.[0],
      qty: effectiveQty,
    });
    trackAddToCart(product.id, product.name, variant.price / 100, effectiveQty);
    router.push('/checkout');
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!product?.id || !reviewBody.trim()) return;
    setReviewSubmitting(true);
    setReviewMessage('');
    try {
      await submitReview(product.id, {
        name: reviewName.trim(),
        rating: reviewRating,
        body: reviewBody.trim(),
      });
      setReviewName('');
      setReviewRating(5);
      setReviewBody('');
      setReviewMessage('Thank you. Your review is submitted and will appear after approval.');
    } catch (err) {
      setReviewMessage('Could not submit review. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-10 animate-slide-up items-start">
        <div className="relative lg:max-w-md">
          <div
            className="aspect-[3/4] lg:aspect-[4/5] rounded-xl sm:rounded-2xl overflow-hidden bg-neutral-100 relative"
            onMouseEnter={() => setZoom(true)}
            onMouseLeave={() => setZoom(false)}
          >
            <Image
              src={mainImage}
              alt={productDisplayName}
              fill
              className={`object-cover transition-transform duration-300 ${zoom ? 'scale-110' : ''}`}
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
              unoptimized={isApiImage || !String(mainImage).startsWith('http')}
            />
            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              className="absolute top-3 right-3 z-10 p-2.5 rounded-full bg-white/90 backdrop-blur-sm shadow-md border border-neutral-200/80 hover:bg-white hover:shadow-lg transition"
              aria-label="Wishlist"
            >
              <svg className="w-5 h-5 text-neutral-700" fill={wishlist.includes(product.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
            </button>
          </div>
          <div className="mt-2 sm:mt-4 flex gap-1.5 sm:gap-2 overflow-x-auto pb-1">
            {variantImageList.map((url, i) => {
              const resolved = resolveImageUrl(url);
              return resolved ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImageIndex(i)}
                  className={`relative h-14 w-14 sm:h-20 sm:w-20 flex-shrink-0 rounded-lg sm:rounded-xl overflow-hidden border-2 ${selectedImageIndex === i ? 'border-neutral-900 ring-2 ring-neutral-400' : 'border-neutral-300'}`}
                >
                  <Image src={resolved} alt={`${productDisplayName} ${i + 1}`} fill className="object-cover" sizes="80px" unoptimized />
                </button>
              ) : null;
            })}
          </div>

          {/* Desktop: size, quantity, CTAs under image */}
          <div className="mt-6 hidden lg:block space-y-4">
            {product.variants?.length > 1 && (
              <div>
                <p className="text-sm font-medium text-neutral-700 mb-1.5">Size / Variant</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`rounded-xl border-2 px-4 py-2 text-sm font-medium transition ${
                        variant?.id === v.id ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 text-neutral-700 hover:border-neutral-400'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-neutral-700 mb-1.5">Quantity</p>
              <div className="inline-flex items-center rounded-xl border-2 border-neutral-200">
                <button
                  type="button"
                  onClick={() => setQty((n) => Math.max(1, (n || 1) - 1))}
                  className="w-12 h-12 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 rounded-l-lg"
                  aria-label="Decrease"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={effectiveQty}
                  onChange={(e) => setQty(Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1)))}
                  className="w-14 h-12 text-center text-base leading-none text-neutral-900 font-medium border-0 border-y border-neutral-200 bg-transparent [appearance:textfield]"
                />
                <button
                  type="button"
                  onClick={() => setQty((n) => Math.min(99, (n || 1) + 1))}
                  className="w-12 h-12 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 rounded-r-lg"
                  aria-label="Increase"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-1">
              <p className="text-sm font-medium text-neutral-600 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-gold-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1h-1m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
                Free shipping
              </p>
              {product.inventory === 0 ? (
                <span className="rounded-2xl border border-neutral-200 bg-neutral-100 py-3.5 text-center text-sm font-medium text-neutral-500">
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
                    className={`w-full rounded-2xl bg-neutral-900 py-3.5 text-sm font-semibold text-white hover:bg-neutral-800 transition ${
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
                    className={`w-full rounded-2xl bg-gold-500 py-3.5 text-sm font-semibold text-neutral-900 hover:bg-gold-400 transition shadow-gold-sm ${
                      orderNowVibrate ? 'animate-vibrate' : 'animate-gold-pulse hover:animate-none'
                    }`}
                  >
                    Order now — Cash on delivery
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4 lg:space-y-4 min-w-0">
          {/* Rating + price first */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-gold-600 text-base sm:text-lg">{'★'.repeat(Math.min(5, Math.round(Number(product.rating) || 0)))}</span>
            <span className="text-neutral-300">{'★'.repeat(5 - Math.min(5, Math.round(Number(product.rating) || 0)))}</span>
            <span className="text-xs sm:text-sm text-neutral-500">({product.reviewCount} reviews)</span>
          </div>
          <p className="text-xl sm:text-2xl font-semibold text-neutral-900">
            {(product.variants?.length > 1 ? variant?.compareAtPrice : product.compareAtPrice) && (
              <span className="text-neutral-400 line-through mr-2 text-base sm:text-lg">{formatPrice(product.variants?.length > 1 ? variant?.compareAtPrice : product.compareAtPrice, currency)}</span>
            )}
            {formatPrice(price, currency)}
          </p>

          {/* Description (desktop only, expandable) */}
          {product.description && (
            <div className="hidden lg:block mt-3">
              <div
                className={`text-sm text-neutral-600 leading-relaxed product-description transition-all ${
                  descriptionExpanded ? '' : 'max-h-64 overflow-hidden'
                }`}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
              />
              <button
                type="button"
                onClick={() => setDescriptionExpanded((v) => !v)}
                className="mt-2 text-xs font-medium text-gold-700 hover:text-gold-600 border-b border-gold-500/50 pb-0.5"
              >
                {descriptionExpanded ? 'View less' : 'View more'}
              </button>
            </div>
          )}

          {/* Mobile / tablet: size, quantity, CTAs below price */}
          <div className="space-y-3 lg:hidden">
            {product.variants?.length > 1 && (
              <div>
                <p className="text-xs sm:text-sm font-medium text-neutral-700 mb-1 sm:mb-1.5">Size / Variant</p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`rounded-lg sm:rounded-xl border-2 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium transition ${
                        variant?.id === v.id ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 text-neutral-700 hover:border-neutral-400'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs sm:text-sm font-medium text-neutral-700 mb-1 sm:mb-1.5">Quantity</p>
              <div className="inline-flex items-center rounded-lg sm:rounded-xl border-2 border-neutral-200">
                <button
                  type="button"
                  onClick={() => setQty((n) => Math.max(1, (n || 1) - 1))}
                  className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 rounded-l-md sm:rounded-l-lg"
                  aria-label="Decrease"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={effectiveQty}
                  onChange={(e) => setQty(Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1)))}
                  className="w-12 sm:w-14 h-10 sm:h-12 text-center text-sm sm:text-base leading-none text-neutral-900 font-medium border-0 border-y border-neutral-200 bg-transparent [appearance:textfield]"
                />
                <button
                  type="button"
                  onClick={() => setQty((n) => Math.min(99, (n || 1) + 1))}
                  className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 rounded-r-md sm:rounded-r-lg"
                  aria-label="Increase"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:gap-2.5 pt-1 sm:pt-1.5">
              <p className="text-xs sm:text-sm font-medium text-neutral-600 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-gold-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1h-1m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
                Free shipping
              </p>
              {product.inventory === 0 ? (
                <span className="rounded-2xl border border-neutral-200 bg-neutral-100 py-3.5 text-center text-sm font-medium text-neutral-500">
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
                    className={`w-full rounded-2xl bg-neutral-900 py-3.5 text-sm font-semibold text-white hover:bg-neutral-800 transition ${
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
                    className={`w-full rounded-2xl bg-gold-500 py-3.5 text-sm font-semibold text-neutral-900 hover:bg-gold-400 transition shadow-gold-sm ${
                      orderNowVibrate ? 'animate-vibrate' : 'animate-gold-pulse hover:animate-none'
                    }`}
                  >
                    Order now — Cash on delivery
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product details: name, description, FAQs (mobile / tablet) */}
      <section className="mt-8 sm:mt-12 lg:mt-16 pt-8 sm:pt-12 border-t border-neutral-200 lg:hidden">
        <h2 className="text-xl font-semibold text-neutral-900">{productDisplayName}</h2>
        {(product.badge || product.badgeSub) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {product.badge && <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white">{product.badge}</span>}
            {product.badgeSub && <span className="rounded-full border border-gold-500/60 bg-gold-50 px-3 py-1 text-xs font-medium text-neutral-900">{product.badgeSub}</span>}
          </div>
        )}
        {product.description && (
            <div className="mt-4">
            <div
              className={`text-neutral-600 product-description transition-all ${
                descriptionExpanded ? '' : 'max-h-64 overflow-hidden'
              }`}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
            />
            <button
              type="button"
              onClick={() => setDescriptionExpanded((v) => !v)}
              className="mt-2 text-xs font-medium text-gold-700 hover:text-gold-600 border-b border-gold-500/50 pb-0.5"
            >
              {descriptionExpanded ? 'View less' : 'View more'}
            </button>
          </div>
        )}
        {(product.faq || []).length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">FAQ</h3>
            <ul className="space-y-2">
              {(product.faq || []).map((item, i) => (
                <li key={i} className="border-b border-neutral-100">
                  <button type="button" onClick={() => setFaqOpen(faqOpen === i ? null : i)} className="w-full py-3 text-left text-sm font-medium text-neutral-700 flex justify-between">
                    {item.q}<span>{faqOpen === i ? '−' : '+'}</span>
                  </button>
                  {faqOpen === i && <p className="pb-3 text-sm text-neutral-500">{item.a}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-6 sm:mt-8 rounded-2xl bg-neutral-100 p-3 sm:p-4 text-sm text-neutral-600 space-y-2">
          <p><strong>Shipping:</strong> {SHIPPING_POLICY}</p>
          <p><strong>Returns:</strong> {RETURN_POLICY}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-neutral-500">
          <span>Secure payment</span><span>Authentic & organic</span><span>30-day returns</span>
        </div>
      </section>

      {/* Write review + recent reviews */}
      <section className="mt-8 sm:mt-12 pt-8 sm:pt-12 border-t border-neutral-200">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Reviews</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-neutral-600 mb-3">Share your experience with this product.</p>
            <form onSubmit={handleSubmitReview} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Your name</label>
                  <input
                    type="text"
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
                  />
                </div>
                <div className="w-full sm:w-40">
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Rating</label>
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value) || 5)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
                  >
                    {[5, 4, 3, 2, 1].map((v) => (
                      <option key={v} value={v}>{`${v} star${v > 1 ? 's' : ''}`}</option>
                    ))}
                  </select>
                </div>
              </div>
            </form>
            <div className="mt-3">
              <label className="block text-xs font-medium text-neutral-700 mb-1">Your review</label>
              <textarea
                value={reviewBody}
                onChange={(e) => setReviewBody(e.target.value)}
                rows={4}
                required
                placeholder="How did this product help you?"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
              />
            </div>
            {reviewMessage && (
              <p className="mt-2 text-xs text-neutral-500">{reviewMessage}</p>
            )}
            <button
              type="submit"
              onClick={handleSubmitReview}
              disabled={reviewSubmitting || !reviewBody.trim()}
              className="mt-3 inline-flex items-center justify-center rounded-2xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              {reviewSubmitting ? 'Submitting…' : 'Submit review'}
            </button>
          </div>
          <div>
            {primaryReviews && primaryReviews.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-neutral-700">
                  Recent reviews{fiveStarReviews.length > 0 ? ' (5-star highlights)' : ''}
                </p>
                {visibleReviews.map((r) => (
                  <div key={r.id} className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-gold-600">{'★'.repeat(Math.min(5, r.rating || 0))}</span>
                      <span className="text-neutral-400">{'★'.repeat(5 - Math.min(5, r.rating || 0))}</span>
                      <span className="text-sm font-medium text-neutral-700">{r.authorName}</span>
                    </div>
                    <p className="text-sm text-neutral-600">{r.body}</p>
                  </div>
                ))}
                {primaryReviews.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setReviewsExpanded((v) => !v)}
                    className="text-sm font-medium text-gold-700 hover:text-gold-600 border-b border-gold-500/50 pb-0.5"
                  >
                    {reviewsExpanded ? 'View less' : `View more reviews (${primaryReviews.length - 3} more)`}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No reviews yet. Be the first to review this product.</p>
            )}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-10 sm:mt-16 lg:mt-20 pt-8 sm:pt-12 lg:pt-16 border-t border-neutral-200">
          <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900 mb-4 sm:mb-8">You may also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {related.map((p, i) => {
              const img = resolveImageUrl(p.images?.[0]) || '/assets/nature-secret-logo.svg';
              const name = p.name ?? p.slug ?? 'Product';
              return (
                <Link key={p.id} href={`/shop/${productPath(p)}`} className="group animate-stagger-in opacity-0" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-100">
                    <Image src={img} alt={name} width={300} height={400} className="h-full w-full object-cover group-hover:scale-105 transition duration-300" unoptimized />
                  </div>
                  <p className="mt-3 font-medium text-neutral-900">{name}</p>
                  <p className="text-sm text-neutral-500">{formatPrice(p.price, currency)}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
