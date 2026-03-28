'use client';

import Link from '@/components/Link';
import Image from 'next/image';
import { useState, useEffect, useMemo } from 'react';
import { useProductsStore } from '@/lib/store';
import { formatPrice } from '@/lib/currency';
import {
  getSlider,
  resolveImageUrl,
  productPath,
  getHighlightReviews,
  getProducts,
  getCategories,
} from '@/lib/api';
import { TRUST_BADGES } from '@/lib/constants';

function mapSliderSlides(list) {
  if (!Array.isArray(list) || list.length === 0) return [];
  return list.map((s) => ({
    id: s.id,
    src: resolveImageUrl(s.imageUrl),
    alt: s.alt || '',
    title: s.title || '',
    href: s.href || '/shop',
  }));
}

export default function HomeContent({
  initialProducts = [],
  initialCategories = [],
  initialSlider = [],
  initialHighlightReviews = [],
}) {
  const setStoreProducts = useProductsStore((s) => s.setProducts);
  const [clientProducts, setClientProducts] = useState(null);
  const [clientCategories, setClientCategories] = useState(null);
  const [clientSlider, setClientSlider] = useState(null);
  const [clientReviews, setClientReviews] = useState(null);
  const [productsError, setProductsError] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [sliderError, setSliderError] = useState(false);

  const ssrSlides = useMemo(() => mapSliderSlides(initialSlider), [initialSlider]);
  const heroSlides = clientSlider != null ? clientSlider : ssrSlides;

  const products = clientProducts != null ? clientProducts : initialProducts;
  const categories = clientCategories != null ? clientCategories : initialCategories;
  const highlightReviews = clientReviews != null ? clientReviews : initialHighlightReviews;

  const bestsellerProducts = Array.isArray(products)
    ? products.filter((p) => (p.inventory ?? 1) > 0).slice(0, 4)
    : [];
  const featuredCategories = Array.isArray(categories) ? categories.slice(0, 2) : [];

  useEffect(() => {
    if (initialProducts.length > 0) {
      setStoreProducts(initialProducts);
      setProductsError(false);
      return;
    }
    let cancelled = false;
    getProducts({ limit: 48 })
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.data) ? res.data : [];
        setClientProducts(list);
        if (list.length) setStoreProducts(list);
        setProductsError(list.length === 0);
      })
      .catch(() => {
        if (!cancelled) {
          setProductsError(true);
          setClientProducts([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialProducts, setStoreProducts]);

  useEffect(() => {
    if (initialCategories.length > 0) return;
    let cancelled = false;
    getCategories()
      .then((list) => {
        if (!cancelled) setClientCategories(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setClientCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [initialCategories.length]);

  useEffect(() => {
    if (ssrSlides.length > 0) return;
    let cancelled = false;
    getSlider()
      .then((list) => {
        if (cancelled) return;
        const mapped = mapSliderSlides(Array.isArray(list) ? list : []);
        setClientSlider(mapped);
        if (mapped.length === 0) setSliderError(true);
      })
      .catch(() => {
        if (!cancelled) {
          setSliderError(true);
          setClientSlider([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ssrSlides.length]);

  useEffect(() => {
    if (initialHighlightReviews.length > 0) return;
    let cancelled = false;
    getHighlightReviews()
      .then((list) => {
        if (!cancelled) setClientReviews(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setClientReviews([]);
      });
    return () => {
      cancelled = true;
    };
  }, [initialHighlightReviews.length]);

  useEffect(() => {
    const n = heroSlides.length;
    if (n === 0) return;
    const t = setInterval(() => setSlideIndex((i) => (i + 1) % n), 5000);
    return () => clearInterval(t);
  }, [heroSlides.length]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-neutral-50 overflow-hidden">
        <div className="absolute left-0 top-24 w-24 h-px bg-gradient-to-r from-gold-400/60 to-transparent" aria-hidden />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-32">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-600 mb-5">
              Natural care, refined
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-neutral-900 tracking-tight leading-[1.08]">
              Natural Care, Refined
            </h1>
            <p className="mt-6 text-lg text-neutral-600 max-w-md leading-relaxed">
              Premium herbal solutions for pain relief and skin wellness. Featuring Painrex Oil: trusted relief for muscle, joint, neck, knee, arthritis, and back pain.
            </p>
            <div className="mt-6 sm:mt-10 flex flex-wrap gap-3 sm:gap-4">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center rounded-2xl bg-neutral-900 px-8 py-3.5 text-sm font-medium text-white shadow-premium transition hover:bg-neutral-800 hover:shadow-gold-md focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:ring-offset-2"
              >
                Shop now
              </Link>
              <Link
                href="/blog"
                className="inline-flex items-center justify-center rounded-2xl border-2 border-neutral-300 bg-white px-8 py-3.5 text-sm font-medium text-neutral-900 transition hover:border-gold-400/60 hover:bg-gold-50/50"
              >
                Read our journal
              </Link>
            </div>
          </div>
        </div>
        {(heroSlides.length > 0 || sliderError) && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-3/4 hidden lg:block">
          <div className="relative w-full h-full rounded-l-2xl overflow-hidden shadow-premium bg-neutral-100">
            {heroSlides.length > 0 ? (
            <>
            {heroSlides.map((slide, i) => (
              <Link
                key={slide.id || i}
                href={slide.href}
                className={`absolute inset-0 transition-opacity duration-700 ${i === slideIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                aria-label={slide.title}
              >
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  className="object-cover"
                  priority={i === 0}
                  sizes="(max-width: 1024px) 0, 600px"
                  quality={75}
                />
              </Link>
            ))}
            <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-center gap-1.5">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSlideIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${i === slideIndex ? 'w-6 bg-gold-500' : 'w-1.5 bg-white/60 hover:bg-white/90'}`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
            </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <p className="text-sm text-neutral-500">Hero images unavailable. Try again later.</p>
              </div>
            )}
          </div>
        </div>
        )}
      </section>

      {/* Trust badges */}
      <section className="border-y border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-7">
          <ul className="flex flex-wrap justify-center gap-4 sm:gap-8 lg:gap-14 text-sm text-neutral-500">
            {TRUST_BADGES.map((b) => (
              <li key={b.id} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold-400/70 shrink-0" aria-hidden />
                {b.text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Bestsellers */}
      {productsError && bestsellerProducts.length === 0 ? (
        <section className="py-10 sm:py-14 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-6 sm:p-12 text-center">
              <p className="text-neutral-600">Unable to load products right now. Try again later.</p>
              <Link href="/shop" className="mt-4 inline-block text-sm font-medium text-gold-700 hover:text-gold-600 border-b border-gold-500/40 pb-0.5">View shop</Link>
            </div>
          </div>
        </section>
      ) : bestsellerProducts.length > 0 ? (
        <section className="py-10 sm:py-14 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-6 sm:mb-12">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">Curated</p>
                <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900 mt-1">Bestsellers</h2>
                <p className="mt-1 text-neutral-500">Herbal oils and skincare, most loved by our community</p>
              </div>
              <Link href="/shop" className="text-sm font-medium text-neutral-900 border-b-2 border-gold-500/40 pb-0.5 hover:border-gold-500 transition-colors whitespace-nowrap flex-shrink-0">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {bestsellerProducts.map((product) => {
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
                        {compareAtPrice && <span className="line-through text-neutral-400 mr-2">{formatPrice(compareAtPrice, 'PKR')}</span>}
                        {formatPrice(price, 'PKR')}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* Featured categories */}
      {productsError && featuredCategories.length === 0 ? (
        <section className="py-10 sm:py-14 lg:py-28 bg-neutral-100/90">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-12 text-center">
              <p className="text-neutral-600">Unable to load collections. Try again later.</p>
            </div>
          </div>
        </section>
      ) : featuredCategories.length > 0 ? (
        <section className="py-10 sm:py-14 lg:py-28 bg-neutral-100/90">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 mb-2">Explore</p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900 mb-6 sm:mb-12">Collections</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
              {featuredCategories.map((cat) => {
                const firstProduct = Array.isArray(products) ? products.find((p) => p.categoryId === cat.id) : null;
                return (
                  <Link key={cat.id} href={`/shop?category=${cat.id}`} className="group block rounded-2xl overflow-hidden bg-white shadow-premium ring-1 ring-neutral-200/60 hover:ring-gold-400/30 transition-all duration-300">
                    <div className="aspect-[4/3] relative">
                      {firstProduct?.images?.[0] ? (
                        <Image
                          src={firstProduct.images[0]}
                          alt={cat.name}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          quality={75}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-neutral-200" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent group-hover:from-black/70 transition" />
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <h3 className="text-xl font-semibold">{cat.name}</h3>
                        <span className="text-sm text-gold-200 mt-1 inline-flex items-center gap-1">Explore <span className="group-hover:translate-x-0.5 transition-transform">→</span></span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* Brand story */}
      <section className="py-10 sm:py-14 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-block w-10 h-px bg-gold-400/50 mb-4 sm:mb-5" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 mb-3 sm:mb-4">Our story</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-neutral-900 tracking-tight">
              Our journey began at home.
            </h2>
            <div className="mt-4 sm:mt-6 space-y-3 text-sm sm:text-base text-neutral-600 leading-relaxed text-left sm:text-center">
              <p>
                Like many families in Pakistan, we often saw loved ones struggling with pain in their knees, back, joints, and muscles.
                Wanting a natural way to ease this discomfort, our father carefully created a herbal oil using traditional knowledge and
                ingredients we trusted.
              </p>
              <p>
                At first, it was only for our own family. Over time, we shared the oil with friends and relatives who were facing similar
                pain. The feedback was overwhelmingly positive. Many told us the oil brought them real comfort and relief.
              </p>
              <p>
                Encouraged by their experiences and our own, we realized this simple formula could help more people. That is how Painrex
                Oil was born.
              </p>
              <p>
                Today, we are proud to share the same oil that started in our home with people across Pakistan. And this is just the
                beginning. Inspired by the same belief in natural care, we are now working on skincare serums and wellness products that
                will soon join our collection.
              </p>
              <p className="font-medium text-neutral-700">
                From our home to yours: care you can trust.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Customer reviews strip */}
      {highlightReviews.length > 0 && (
        <section className="py-8 sm:py-10 bg-neutral-50 border-y border-neutral-200/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 mb-3">
              What customers say
            </p>
            <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-300">
              {highlightReviews.map((r) => (
                <div
                  key={r.id}
                  className="min-w-[220px] max-w-xs rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm flex-shrink-0"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gold-600 text-sm">
                      {'★'.repeat(Math.min(5, r.rating || 0))}
                    </span>
                    <span className="text-neutral-300 text-sm">
                      {'★'.repeat(5 - Math.min(5, r.rating || 0))}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-neutral-800 line-clamp-2">{r.body}</p>
                  <p className="mt-2 text-[11px] text-neutral-500 truncate">
                    {r.authorName || 'Customer'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}


      {/* CTA */}
      <section className="py-10 sm:py-14 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-neutral-900 px-4 sm:px-6 py-10 sm:py-16 lg:py-20 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(203,168,71,0.4) 0%, transparent 50%)' }} aria-hidden />
            <div className="relative">
              <h2 className="text-2xl sm:text-3xl font-semibold text-white">Try our best-selling pain relief oil</h2>
              <p className="mt-3 text-neutral-300 max-w-md mx-auto">Painrex Oil, trusted across Pakistan for muscle, joint and back pain. Skincare range coming soon.</p>
              <Link
                href="/shop"
                className="mt-5 sm:mt-8 inline-flex items-center justify-center rounded-2xl bg-gold-500 px-8 py-3.5 text-sm font-semibold text-neutral-900 transition hover:bg-gold-400 shadow-gold-md focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-neutral-900"
              >
                Shop herbal oils
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
