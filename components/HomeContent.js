'use client';

import Link from '@/components/Link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useState, useEffect, useMemo } from 'react';
import { useProductsStore } from '@/lib/store';
import {
  getSlider,
  resolveImageUrl,
  getProducts,
  getCategories,
  getContentSettings,
} from '@/lib/api';
import { getDevFallbackCategories, getDevFallbackProducts } from '@/lib/devCatalogFallback';
import { HomeTrustStrip } from '@/components/HomeTrustStrip';
const HomeBelowFold = dynamic(() => import('@/components/HomeBelowFold'), {
  loading: () => <div className="min-h-[40vh] w-full bg-page-canvas" aria-hidden />,
  ssr: true,
});

/** Client fallback if API unavailable (mirrors backend SettingsService DEFAULTS). */
const HOME_CONTENT_FALLBACK = {
  homeHeroIntro:
    'Premium botanical skincare and body oils for a calm routine. Nature Secret PX Oil is a relaxing massage oil—comforting neck, muscles, and joints when they feel tired or tight after long days.',
  homeStoryLabel: 'Our story',
  homeStoryHeading: 'Our journey began at home.',
  homeStoryHtml: `<p>Like many families in Pakistan, we wanted simple, honest care at home. Our father crafted a botanical body oil from traditional plant knowledge and ingredients we already trusted—first for family, then for friends.</p><p>At first, it was only for our own family. Over time, we shared the oil with friends and relatives who wanted a soothing massage ritual. The feedback was overwhelmingly positive—many loved the feel on skin and the quiet evening routine.</p><p>Encouraged by their experiences, we realized this simple formula could support more people in their daily self-care routines. That is how <strong>Nature Secret PX Oil</strong> was born—a relaxing massage oil many use to comfort neck, muscles, and joints as part of their unwind ritual.</p><p>Today, we are proud to share the same heritage-inspired oil with people across Pakistan. Inspired by our belief in natural care, we are now developing a collection of skincare serums and body care for your modern routine.</p><p><strong>From our home to yours: Natural care you can trust.</strong></p>`,
};

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
  initialHomeContent = null,
}) {
  const setStoreProducts = useProductsStore((s) => s.setProducts);
  const [clientProducts, setClientProducts] = useState(null);
  const [clientCategories, setClientCategories] = useState(null);
  const [clientSlider, setClientSlider] = useState(null);
  const [productsError, setProductsError] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [sliderError, setSliderError] = useState(false);
  const [homeContent, setHomeContent] = useState(initialHomeContent);
  const ssrSlides = useMemo(() => mapSliderSlides(initialSlider), [initialSlider]);
  const heroSlides = clientSlider != null ? clientSlider : ssrSlides;

  const isDev = process.env.NODE_ENV === 'development';

  const products = clientProducts != null ? clientProducts : initialProducts;
  const categories = clientCategories != null ? clientCategories : initialCategories;

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
        let list = Array.isArray(res?.data) ? res.data : [];
        if (isDev && list.length === 0) list = getDevFallbackProducts();
        setClientProducts(list);
        if (list.length) setStoreProducts(list);
        setProductsError(list.length === 0);
      })
      .catch(() => {
        if (!cancelled) {
          if (isDev) {
            const list = getDevFallbackProducts();
            setClientProducts(list);
            setStoreProducts(list);
            setProductsError(false);
          } else {
            setProductsError(true);
            setClientProducts([]);
          }
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialProducts, setStoreProducts, isDev]);

  useEffect(() => {
    if (initialCategories.length > 0) return;
    let cancelled = false;
    getCategories()
      .then((list) => {
        if (cancelled) return;
        let next = Array.isArray(list) ? list : [];
        if (isDev && next.length === 0) next = getDevFallbackCategories();
        setClientCategories(next);
      })
      .catch(() => {
        if (!cancelled) setClientCategories(isDev ? getDevFallbackCategories() : []);
      });
    return () => {
      cancelled = true;
    };
  }, [initialCategories.length, isDev]);

  useEffect(() => {
    let cancelled = false;
    getSlider()
      .then((list) => {
        if (cancelled) return;
        const mapped = mapSliderSlides(Array.isArray(list) ? list : []);
        setClientSlider(mapped);
        if (mapped.length === 0) setSliderError(true);
      })
      .catch(() => {
        if (!cancelled) setSliderError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getContentSettings()
      .then((r) => {
        if (cancelled || !r || typeof r !== 'object') return;
        setHomeContent({
          homeHeroIntro: r.homeHeroIntro ?? '',
          homeStoryLabel: r.homeStoryLabel ?? '',
          homeStoryHeading: r.homeStoryHeading ?? '',
          homeStoryHtml: r.homeStoryHtml ?? '',
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const home = useMemo(() => {
    if (homeContent?.homeHeroIntro) return homeContent;
    return HOME_CONTENT_FALLBACK;
  }, [homeContent]);

  const showHeroVisual = heroSlides.length > 0 || sliderError;

  useEffect(() => {
    const n = heroSlides.length;
    if (n === 0) return;
    const t = setInterval(() => setSlideIndex((i) => (i + 1) % n), 5000);
    return () => clearInterval(t);
  }, [heroSlides.length]);

  return (
    <div className="min-h-screen bg-page-canvas">
      {/* Hero — mobile: visual first; desktop: editorial two-column */}
      <section className="relative overflow-hidden border-b border-neutral-200/30 bg-section-ambient">
        <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8 py-10 sm:py-14 lg:py-24">
          <div
            className={`grid grid-cols-1 items-center gap-8 lg:gap-12 xl:gap-16 ${showHeroVisual ? 'lg:grid-cols-12' : ''}`}
          >
            <div
              className={`order-2 max-w-xl lg:order-1 ${showHeroVisual ? 'lg:col-span-5' : 'lg:col-span-12 lg:max-w-2xl'}`}
            >
              <p className="flex items-center gap-2 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.24em] text-neutral-500 mb-3 sm:mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-900 shadow-[0_0_0_1px_rgba(255,255,255,0.15)]" aria-hidden />
                Natural care, refined
              </p>
              <h1 className="font-display text-3xl sm:text-[2.85rem] lg:text-[3.35rem] font-semibold text-neutral-900 leading-[1.05] text-balance">
                Natural Care, Refined for Everyday Beauty.
              </h1>
              <p className="mt-4 sm:mt-6 text-sm sm:text-base text-neutral-600 max-w-md leading-relaxed whitespace-pre-wrap">
                {home.homeHeroIntro}
              </p>
              <div className="mt-6 sm:mt-9 flex flex-wrap gap-3">
                <Link
                  href="/shop"
                  className="btn-gold-primary inline-flex min-h-[44px] items-center justify-center rounded-full px-8 py-3 text-xs sm:text-sm text-white transition duration-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
                >
                  Shop now
                </Link>
                <Link
                  href="/blog"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border-2 border-neutral-300 bg-white/90 px-8 py-3 text-xs sm:text-sm font-semibold text-neutral-900 shadow-sm backdrop-blur-md transition duration-300 hover:border-neutral-900 hover:bg-neutral-50 hover:shadow-md"
                >
                  Read our journal
                </Link>
              </div>
              <div className="mt-8 sm:mt-10 lg:mt-12">
                <HomeTrustStrip />
              </div>
            </div>

            {showHeroVisual ? (
            <div className="order-1 lg:order-2 lg:col-span-7">
                <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-3 rounded-[1.35rem] bg-gradient-to-br from-neutral-200/60 via-transparent to-neutral-100/40 opacity-90 blur-2xl sm:-inset-4 lg:-inset-5"
                  />
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.25rem] border border-white/80 bg-neutral-100 shadow-lift-lg ring-1 ring-neutral-900/[0.04] sm:aspect-[5/6] lg:aspect-[4/5] frame-media-inset">
                    {heroSlides.length > 0 ? (
                      <>
                        {heroSlides.map((slide, i) => (
                          <Link
                            key={slide.id || i}
                            href={slide.href}
                            className={`absolute inset-0 transition-opacity duration-700 ${i === slideIndex ? 'z-10 opacity-100' : 'z-0 opacity-0'}`}
                            aria-label={slide.title}
                          >
                            <Image
                              src={slide.src}
                              alt={slide.alt}
                              fill
                              className="object-cover"
                              priority={i === 0}
                              fetchPriority={i === 0 ? 'high' : 'low'}
                              sizes="(max-width: 1024px) 100vw, 55vw"
                              quality={72}
                              decoding="async"
                            />
                          </Link>
                        ))}
                        <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center px-4">
                          <div className="flex gap-1.5 rounded-full border border-white/20 bg-black/20 px-2.5 py-2 backdrop-blur-md">
                            {heroSlides.map((_, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setSlideIndex(i)}
                                className={`h-1 rounded-full transition-all duration-300 ${i === slideIndex ? 'w-8 bg-white shadow-sm' : 'w-1.5 bg-white/50 hover:bg-white/85'}`}
                                aria-label={`Go to slide ${i + 1}`}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
                        <p className="text-sm text-neutral-500">Hero images unavailable. Try again later.</p>
                      </div>
                    )}
                  </div>
                </div>
            </div>
            ) : null}
          </div>
        </div>
      </section>

      <HomeBelowFold
        productsError={productsError}
        bestsellerProducts={bestsellerProducts}
        featuredCategories={featuredCategories}
        products={products}
        home={home}
      />

    </div>
  );
}
