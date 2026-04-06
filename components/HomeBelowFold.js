'use client';

import Link from '@/components/Link';
import Image from 'next/image';
import { formatPrice } from '@/lib/currency';
import { productPath } from '@/lib/api';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

/**
 * Below-the-fold home sections — loaded as a separate chunk to reduce
 * initial JS parse on the hero (better Speed Index / TTI).
 */
export default function HomeBelowFold({
  productsError,
  bestsellerProducts,
  featuredCategories,
  products,
  home,
}) {
  return (
    <>
      <HomeBestsellersSection
        productsError={productsError}
        bestsellerProducts={bestsellerProducts}
      />
      <HomeFeaturedCategoriesSection
        productsError={productsError}
        featuredCategories={featuredCategories}
        products={products}
      />
      <section className="py-7 sm:py-11 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-block w-10 h-px bg-gold-400/50 mb-4 sm:mb-5" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 mb-3 sm:mb-4">{home.homeStoryLabel}</p>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-semibold text-neutral-900 tracking-tight leading-snug">
              {home.homeStoryHeading}
            </h2>
            <div
              className="mt-3 sm:mt-6 text-xs sm:text-base text-neutral-600 leading-relaxed text-left sm:text-center [&_p]:text-left [&_p]:sm:text-center [&_p]:mb-3 [&_p:last-child]:mb-0"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(home.homeStoryHtml || '') }}
            />
          </div>
        </div>
      </section>
    </>
  );
}

function HomeBestsellersSection({ productsError, bestsellerProducts }) {
  if (productsError && bestsellerProducts.length === 0) {
    return (
      <section className="py-7 sm:py-11 lg:py-28">
        <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-6 sm:p-12 text-center">
            <p className="text-neutral-600">Unable to load products right now. Try again later.</p>
            <Link href="/shop" className="mt-4 inline-block text-sm font-medium text-gold-700 hover:text-gold-600 border-b border-gold-500/40 pb-0.5">View shop</Link>
          </div>
        </div>
      </section>
    );
  }
  if (bestsellerProducts.length === 0) return null;

  return (
    <section className="py-7 sm:py-11 lg:py-28">
      <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
        <div className="flex items-end justify-between mb-4 sm:mb-10 lg:mb-12">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">Curated</p>
            <h2 className="text-xl sm:text-3xl font-semibold text-neutral-900 mt-0.5 sm:mt-1 tracking-tight">Bestsellers</h2>
            <p className="mt-1 text-xs sm:text-sm text-neutral-500 leading-snug">Botanical body care and skincare, most loved by our community</p>
          </div>
          <Link href="/shop" className="text-sm font-medium text-neutral-900 border-b-2 border-gold-500/40 pb-0.5 hover:border-gold-500 transition-colors whitespace-nowrap flex-shrink-0">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-8">
          {bestsellerProducts.map((product, bi) => {
            const img = (product.images && product.images[0]) || product.image || '/assets/nature-secret-logo.svg';
            const name = product.name ?? product.slug ?? 'Product';
            const variants = Array.isArray(product.variants) ? product.variants : [];
            const defaultVariant = variants.reduce(
              (best, v) => (best == null || (v.price ?? 0) < (best.price ?? 0) ? v : best),
              null,
            );
            const price = defaultVariant?.price ?? product.price;
            const compareAtPrice =
              variants.length > 1 ? defaultVariant?.compareAtPrice : product.compareAtPrice;
            return (
              <Link key={product.id} href={`/shop/${productPath(product)}`} className="group group/card">
                <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-100 relative ring-1 ring-neutral-200/80 group-hover/card:ring-gold-400/40 transition-all duration-300 shadow-soft group-hover/card:shadow-gold-sm">
                  <Image
                    src={img}
                    alt={name}
                    width={400}
                    height={533}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    quality={75}
                    priority={bi === 0}
                    fetchPriority={bi === 0 ? 'high' : 'low'}
                    decoding="async"
                  />
                  {product.badge && (
                    <span className="absolute top-3 left-3 rounded-full bg-neutral-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white ring-1 ring-gold-500/60 shadow-gold-sm">
                      {product.badge}
                    </span>
                  )}
                </div>
                <div className="mt-2 sm:mt-4">
                  <p className="font-medium text-neutral-900 group-hover/card:text-gold-700 transition-colors">{name}</p>
                  <p className="mt-1 text-sm font-medium text-gold-700/90">
                    {compareAtPrice && <span className="line-through text-neutral-500 mr-2">{formatPrice(compareAtPrice, 'PKR')}</span>}
                    {formatPrice(price, 'PKR')}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HomeFeaturedCategoriesSection({ productsError, featuredCategories, products }) {
  if (productsError && featuredCategories.length === 0) {
    return (
      <section className="py-7 sm:py-11 lg:py-28 bg-neutral-100/90">
        <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-12 text-center">
            <p className="text-neutral-600">Unable to load collections. Try again later.</p>
          </div>
        </div>
      </section>
    );
  }
  if (featuredCategories.length === 0) return null;

  return (
    <section className="py-7 sm:py-11 lg:py-28 bg-neutral-100/90">
      <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 mb-1.5 sm:mb-2">Explore</p>
        <h2 className="text-xl sm:text-3xl font-semibold text-neutral-900 mb-4 sm:mb-10 lg:mb-12 tracking-tight">Collections</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5 lg:gap-8">
          {featuredCategories.map((cat) => {
            const firstProduct = Array.isArray(products) ? products.find((p) => p.categoryId === cat.id) : null;
            return (
              <Link key={cat.id} href={`/shop?category=${encodeURIComponent(cat.slug)}`} className="group block rounded-2xl overflow-hidden bg-white shadow-premium ring-1 ring-neutral-200/60 hover:ring-gold-400/30 transition-all duration-300">
                <div className="aspect-[4/3] relative">
                  {firstProduct?.images?.[0] ? (
                    <Image
                      src={firstProduct.images[0]}
                      alt={cat.name}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      quality={70}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-neutral-200" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent group-hover:from-black/70 transition" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h3 className="text-lg sm:text-xl font-semibold">{cat.name}</h3>
                    <span className="text-sm text-gold-200 mt-1 inline-flex items-center gap-1">Explore <span className="group-hover:translate-x-0.5 transition-transform">→</span></span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
