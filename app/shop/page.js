'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useProductsStore } from '@/lib/store';
import { useProductsAndCategories } from '@/lib/useApiData';
import { useCartStore, useCartOpenStore } from '@/lib/store';
import { useWishlistStore } from '@/lib/store';
import { CartIcon } from '@/components/icons/CartIcon';
import { HeartIcon } from '@/components/icons/HeartIcon';
import { trackAddToCart } from '@/lib/analytics';
import { formatPrice } from '@/lib/currency';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
];

function ShopContent() {
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get('category') || '';
  const [sort, setSort] = useState('featured');
  const storeProducts = useProductsStore((s) => s.products);
  const { products, categories, loading: apiLoading } = useProductsAndCategories(storeProducts);

  const filtered = useMemo(() => {
    let list = [...(products || [])];
    if (categorySlug && Array.isArray(categories)) {
      const cat = categories.find((c) => c.slug === categorySlug);
      if (cat) list = list.filter((p) => p.categoryId === cat.id);
    }
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'newest') list.reverse();
    return list;
  }, [categorySlug, sort, products]);

  const addToCart = useCartStore((s) => s.addItem);
  const openCart = useCartOpenStore((s) => s.open);
  const wishlist = useWishlistStore((s) => s.productIds);
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  function handleQuickAdd(product, variant) {
    addToCart({
      productId: product.id,
      variantId: variant.id,
      price: variant.price,
      name: product.name,
      image: variant.image || product.images?.[0],
    });
    openCart();
    trackAddToCart(product.id, product.name, variant.price / 100, 1);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-56 flex-shrink-0">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-700/90 mb-4">Category</h3>
          <ul className="space-y-1">
            <li>
              <Link
                href="/shop"
                className={`block py-2.5 px-3 rounded-xl text-sm transition-colors ${!categorySlug ? 'font-medium text-neutral-900 bg-gold-50 text-gold-800 border border-gold-200/60' : 'text-neutral-600 hover:text-gold-700 hover:bg-gold-50/50'}`}
              >
                All
              </Link>
            </li>
            {(categories || []).map((c) => (
              <li key={c.id || c.slug}>
                <Link
                  href={`/shop?category=${c.slug}`}
                  className={`block py-2.5 px-3 rounded-xl text-sm transition-colors ${categorySlug === c.slug ? 'font-medium text-neutral-900 bg-gold-50 text-gold-800 border border-gold-200/60' : 'text-neutral-600 hover:text-gold-700 hover:bg-gold-50/50'}`}
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">
                {categorySlug ? (categories || []).find((c) => c.slug === categorySlug)?.name || 'Shop' : 'Shop'}
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-sm text-neutral-500">Sort by</label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {apiLoading && (!products || products.length === 0) ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200/80">
                  <div className="aspect-[3/4] bg-neutral-200 animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-neutral-200 animate-pulse" />
                    <div className="h-4 w-1/3 rounded bg-neutral-100 animate-pulse" />
                  </div>
                </div>
              ))
            ) : (
            filtered.map((product) => {
              const variant = product.variants?.[0];
              const price = variant?.price ?? product.price;
              const inWishlist = wishlist.includes(product.id);
              return (
                <article key={product.id} className="group">
                  <Link href={`/shop/${product.slug}`} className="block">
                    <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-100 relative ring-1 ring-neutral-200/80 group-hover:ring-gold-400/40 transition-all duration-300 shadow-soft group-hover:shadow-gold-sm">
                      {product.badge && (
                        <span className="absolute top-3 left-3 z-10 rounded-full bg-neutral-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white ring-1 ring-gold-500/60 shadow-gold-sm">
                          {product.badge}
                        </span>
                      )}
                      <Image
                        src={product.images?.[0] || '/assets/nature-secret-logo.svg'}
                        alt={product.name}
                        width={400}
                        height={533}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                      />
                      {product.images?.[1] && (
                        <Image
                          src={product.images[1]}
                          alt=""
                          width={400}
                          height={533}
                          className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-300 group-hover:opacity-100"
                        />
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); toggleWishlist(product.id); }}
                        className="absolute top-3 right-3 p-2 rounded-full bg-white/95 text-neutral-500 hover:text-gold-600 shadow-soft transition-colors"
                        aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        <HeartIcon className={`w-5 h-5 ${inWishlist ? 'fill-gold-500 text-gold-500' : ''}`} />
                      </button>
                    </div>
                  </Link>
                  <div className="mt-4">
                    <Link href={`/shop/${product.slug}`}>
                      <p className="font-medium text-neutral-900">{product.name}</p>
                    </Link>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm text-gold-500">{'★'.repeat(5)}</span>
                      <span className="text-xs text-neutral-400">({product.reviewCount})</span>
                    </div>
                    <p className="mt-1 text-sm text-neutral-600">
                      {product.compareAtPrice && (
                        <span className="line-through text-neutral-400 mr-2">{formatPrice(product.compareAtPrice, 'PKR')}</span>
                      )}
                      {formatPrice(price, 'PKR')}
                    </p>
                    {product.inventory === 0 ? (
                      <p className="mt-3 py-2.5 text-center text-sm text-neutral-500 rounded-xl border border-neutral-200 bg-neutral-50">Out of stock</p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => variant && handleQuickAdd(product, variant)}
                        className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-neutral-300 py-2.5 text-sm font-medium text-neutral-900 hover:border-gold-400/60 hover:bg-gold-50/50 transition-colors"
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
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-12 text-neutral-500">Loading…</div>}>
      <ShopContent />
    </Suspense>
  );
}
