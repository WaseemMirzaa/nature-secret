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
      <section className="border-t border-b border-neutral-200/40 bg-gradient-to-b from-white via-neutral-50/40 to-white py-12 sm:py-16 lg:py-28">
        <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-5 h-px w-12 bg-gradient-to-r from-transparent via-neutral-300 to-transparent sm:mb-6" aria-hidden />
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500 mb-3 sm:mb-4">{home.homeStoryLabel}</p>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-[2.5rem] font-semibold text-neutral-900 leading-snug text-balance">
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
      <section className="py-10 sm:py-14 lg:py-24 bg-page-canvas border-y border-neutral-200/40">
        <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 sm:p-12 text-center shadow-sm">
            <p className="text-neutral-600">Unable to load products right now. Try again later.</p>
            <Link href="/shop" className="mt-4 inline-block text-sm font-medium text-neutral-900 border-b border-neutral-900/30 pb-0.5 hover:border-neutral-900">View shop</Link>
          </div>
        </div>
      </section>
    );
  }
  if (bestsellerProducts.length === 0) return null;

  return (
    <section className="py-10 sm:py-14 lg:py-24 bg-page-canvas border-y border-neutral-200/40">
      <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
        <div className="flex items-end justify-between mb-4 sm:mb-10 lg:mb-12 gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
              <span className="h-px w-6 bg-neutral-900/25" aria-hidden />
              Curated
            </p>
            <h2 className="font-display mt-0.5 text-xl font-semibold text-neutral-900 sm:mt-1 sm:text-3xl">Bestsellers</h2>
            <p className="mt-1 text-xs sm:text-sm text-neutral-500 leading-snug">Botanical body care and skincare, most loved by our community</p>
          </div>
          <Link
            href="/shop"
            className="btn-gold-primary shrink-0 inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm text-white transition hover:shadow-lg"
          >
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
              <Link key={product.id} href={`/shop/${productPath(product)}`} className="group group/card block">
                <div className="relative aspect-[3/4] overflow-hidden rounded-[1.35rem] border border-neutral-200/60 bg-neutral-100 shadow-card transition-all duration-500 frame-media-inset group-hover/card:border-neutral-400 group-hover/card:shadow-lift-lg">
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
                    <span className="absolute top-3 left-3 rounded-full border border-neutral-900/12 bg-accent-cream px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-900 shadow-sm">
                      {product.badge}
                    </span>
                  )}
                </div>
                <div className="mt-2 sm:mt-4">
                  <p className="font-medium text-neutral-900 group-hover/card:text-neutral-700 transition-colors">{name}</p>
                  <p className="mt-1 text-sm font-medium text-neutral-800">
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
      <section className="py-10 sm:py-14 lg:py-24 bg-page-canvas">
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
    <section className="py-10 sm:py-14 lg:py-24 bg-page-canvas">
      <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
        <p className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] text-neutral-500 mb-1.5 sm:mb-2">Explore</p>
        <h2 className="font-display mb-4 text-xl font-semibold text-neutral-900 sm:mb-10 sm:text-3xl lg:mb-12">Collections</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5 lg:gap-8">
          {featuredCategories.map((cat) => {
            const firstProduct = Array.isArray(products) ? products.find((p) => p.categoryId === cat.id) : null;
            return (
              <Link key={cat.id} href={`/shop?category=${encodeURIComponent(cat.slug)}`} className="group block rounded-2xl overflow-hidden border border-neutral-200/70 bg-white transition-all duration-500 hover:border-neutral-300 hover:shadow-[0_24px_48px_-28px_rgba(0,0,0,0.14)]">
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
                    <div className="absolute inset-0 bg-neutral-200/50" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent group-hover:from-black/70 transition" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h3 className="text-lg sm:text-xl font-semibold">{cat.name}</h3>
                    <span className="text-sm text-white/90 mt-1 inline-flex items-center gap-1">Explore <span className="group-hover:translate-x-0.5 transition-transform">→</span></span>
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
