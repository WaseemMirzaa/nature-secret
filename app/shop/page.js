'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useState, useEffect, Suspense } from 'react';
import Link from '@/components/Link';
import Image from 'next/image';
import { useProductsStore } from '@/lib/store';
import { useProductsAndCategories } from '@/lib/useApiData';
import { useCartStore, useCartOpenStore, useWishlistStore, useCurrencyStore } from '@/lib/store';
import { CartIcon } from '@/components/icons/CartIcon';
import { HeartIcon } from '@/components/icons/HeartIcon';
import { trackAddToCart, trackAddToWishlist } from '@/lib/analytics';
import { formatPrice } from '@/lib/currency';
import { resolveImageUrl, productPath } from '@/lib/api';
import { buildPathWithStoredAttribution } from '@/lib/attribution';
import { InlineLoader } from '@/components/ui/PageLoader';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
];

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categorySlug = searchParams.get('category') || '';
  const [sort, setSort] = useState('featured');
  const storeProducts = useProductsStore((s) => s.products);
  const { products, categories, loading: apiLoading, error: apiError } = useProductsAndCategories(storeProducts);

  /** Resolved only after categories load — avoids treating URL category as missing while API is in flight. */
  const resolvedCategory = useMemo(() => {
    if (!categorySlug || !Array.isArray(categories) || categories.length === 0) return null;
    return categories.find((c) => c.slug === categorySlug) ?? null;
  }, [categorySlug, categories]);

  /** Move selected category to top of sidebar as soon as slug matches (do not wait on extra flags). */
  const sidebarCategories = useMemo(() => {
    const list = [...(categories || [])];
    if (!categorySlug || !list.length) return list;
    const i = list.findIndex((c) => c.slug === categorySlug);
    if (i <= 0) return list;
    const next = [...list];
    const [sel] = next.splice(i, 1);
    return [sel, ...next];
  }, [categories, categorySlug]);

  const filtered = useMemo(() => {
    let list = [...(products || [])];
    if (categorySlug) {
      if (!resolvedCategory) {
        return [];
      }
      list = list.filter((p) => p.categoryId === resolvedCategory.id);
    }
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'newest') list.reverse();
    return list;
  }, [categorySlug, resolvedCategory, sort, products]);

  const categoryFilterPending = Boolean(categorySlug && !resolvedCategory && apiLoading);

  useEffect(() => {
    if (apiLoading || !resolvedCategory) return;
    if (filtered.length !== 1) return;
    const p = filtered[0];
    router.replace(buildPathWithStoredAttribution(`/shop/${productPath(p)}`));
  }, [apiLoading, resolvedCategory, filtered, router]);

  const addItemIfNew = useCartStore((s) => s.addItemIfNew);
  const openCart = useCartOpenStore((s) => s.open);
  const wishlist = useWishlistStore((s) => s.productIds);
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const currency = useCurrencyStore((s) => s.currency);
  const [quickAddVibrate, setQuickAddVibrate] = useState(null);

  function handleQuickAdd(product, variant) {
    const added = addItemIfNew({
      productId: product.id,
      variantId: variant.id,
      price: variant.price,
      name: product.name,
      image: (variant.images && variant.images[0]) || variant.image || product.images?.[0],
    });
    openCart();
    if (added) trackAddToCart(product, variant.price / 100, 1, currency);
  }

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8 py-3 sm:py-5 lg:py-12">
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-5 lg:gap-8">
        <aside className="lg:w-56 flex-shrink-0 animate-slide-up rounded-2xl border border-neutral-200/60 bg-white/80 p-3 sm:p-4 lg:self-start backdrop-blur-sm">
          <h3 className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500 mb-3 sm:mb-4">Category</h3>
          <ul className="space-y-1">
            <li>
              <Link
                href="/shop"
                className={`block py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-lg sm:rounded-xl text-xs sm:text-sm transition-colors ${!categorySlug ? 'font-semibold text-white bg-neutral-900 border border-neutral-900 shadow-gold-sm' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'}`}
              >
                All
              </Link>
            </li>
            {sidebarCategories.map((c) => (
              <li key={c.id || c.slug}>
                <Link
                  href={`/shop?category=${c.slug}`}
                  className={`block py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-lg sm:rounded-xl text-xs sm:text-sm transition-colors ${categorySlug === c.slug ? 'font-semibold text-white bg-neutral-900 border border-neutral-900 shadow-gold-sm' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'}`}
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-6 lg:mb-8">
            <div>
              <h1 className="font-display text-xl font-semibold text-neutral-900 sm:text-2xl lg:text-3xl">
                {categorySlug ? (resolvedCategory?.name ?? 'Shop') : 'Shop'}
              </h1>
              <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-neutral-500">
                {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-xs sm:text-sm text-neutral-500">Sort by</label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-lg sm:rounded-xl border border-neutral-600 sm:border-2 sm:border-neutral-600 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-neutral-900"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 lg:gap-8">
            {(apiLoading && (!products || products.length === 0)) || categoryFilterPending ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden bg-neutral-50 border border-neutral-200">
                  <div className="aspect-[3/4] bg-neutral-200/60 animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-neutral-200 animate-pulse" />
                    <div className="h-4 w-1/3 rounded bg-neutral-100 animate-pulse" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="col-span-full rounded-xl sm:rounded-2xl border border-neutral-200 bg-white p-6 sm:p-10 lg:p-12 text-center">
                <p className="text-neutral-600">{apiError ? 'Unable to load products. Try again later.' : 'No products to show right now. The catalog may be updating—please try again later.'}</p>
                <Link href="/" className="mt-4 inline-block text-sm font-medium text-neutral-900 border-b border-neutral-900/25 pb-0.5 hover:border-neutral-900">Back to home</Link>
              </div>
            ) : (
            filtered.map((product, index) => {
              const variant = product.variants?.[0];
              const price = variant?.price ?? product.price;
              const compareAtPrice = product.variants?.length > 1 ? variant?.compareAtPrice : product.compareAtPrice;
              const inWishlist = wishlist.includes(product.id);
              return (
                <article key={product.id} className="group animate-stagger-in opacity-0" style={{ animationDelay: `${index * 75}ms` }}>
                  <Link href={`/shop/${productPath(product)}`} className="block">
                    <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-100 relative border border-neutral-200/60 transition-all duration-500 group-hover:border-neutral-300 group-hover:shadow-[0_20px_50px_-28px_rgba(0,0,0,0.14)]">
                      {product.badge && (
                        <span className="absolute top-3 left-3 z-10 rounded-full border border-neutral-900/12 bg-accent-cream px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-900 shadow-sm">
                          {product.badge}
                        </span>
                      )}
                      <Image
                        src={resolveImageUrl(product.images?.[0]) || '/assets/nature-secret-logo.svg'}
                        alt={product.imageAlts?.[0] || product.name || ''}
                        width={400}
                        height={533}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        quality={75}
                        priority={index === 0}
                        fetchPriority={index === 0 ? 'high' : 'low'}
                      />
                      {product.images?.[1] && (
                        <Image
                          src={resolveImageUrl(product.images[1])}
                          alt={product.imageAlts?.[1] || product.name || ''}
                          width={400}
                          height={533}
                          className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-300 group-hover:opacity-100"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          quality={70}
                          loading="lazy"
                        />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          const willAdd = !wishlist.includes(product.id);
                          toggleWishlist(product.id);
                          if (willAdd) {
                            trackAddToWishlist(product, price / 100, currency);
                          }
                        }}
                        className="absolute top-3 right-3 p-2 rounded-full bg-white/95 text-neutral-500 hover:text-neutral-900 shadow-sm transition-colors"
                        aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        <HeartIcon className={`w-5 h-5 ${inWishlist ? 'fill-neutral-900 text-neutral-900' : ''}`} />
                      </button>
                    </div>
                  </Link>
                  <div className="mt-2 sm:mt-4">
                    <Link href={`/shop/${productPath(product)}`}>
                      <p className="font-medium text-neutral-900 text-sm sm:text-base">{product.name ?? product.slug ?? 'Product'}</p>
                    </Link>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm text-neutral-700">{'★'.repeat(5)}</span>
                      <span className="text-xs text-neutral-500">({product.reviewCount})</span>
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-neutral-600">
                      {compareAtPrice && (
                        <span className="line-through text-neutral-500 mr-2">{formatPrice(compareAtPrice, 'PKR')}</span>
                      )}
                      {formatPrice(price, 'PKR')}
                    </p>
                    {product.inventory === 0 ? (
                      <p className="mt-2 sm:mt-3 py-2 sm:py-2.5 text-center text-xs sm:text-sm text-neutral-600 rounded-lg sm:rounded-xl border border-neutral-200 bg-neutral-50">Out of stock</p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (variant) {
                            handleQuickAdd(product, variant);
                            setQuickAddVibrate(product.id);
                            setTimeout(() => setQuickAddVibrate(null), 400);
                          }
                        }}
                        className={`mt-2 sm:mt-3 w-full flex items-center justify-center gap-2 rounded-full sm:rounded-2xl border border-neutral-300 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-neutral-900 hover:border-neutral-900 hover:bg-neutral-50 transition-colors ${quickAddVibrate === product.id ? 'animate-vibrate' : 'animate-cta-attract hover:animate-none'}`}
                      >
                        <CartIcon className="w-4 h-4" />
                        Quick add
                      </button>
                    )}
                  </div>
                </article>
              );
            })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8 py-5 sm:py-10 lg:py-12"><InlineLoader /></div>}>
      <ShopContent />
    </Suspense>
  );
}
