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
import { TRUST_BADGES } from '@/lib/constants';

const HomeBelowFold = dynamic(() => import('@/components/HomeBelowFold'), {
  loading: () => <div className="min-h-[40vh] w-full bg-neutral-50/40" aria-hidden />,
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
    if (homeContent?.homeHeroIntro) return;
    let cancelled = false;
    getContentSettings()
      .then((r) => {
        if (!cancelled && r?.homeHeroIntro) setHomeContent(r);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [homeContent?.homeHeroIntro]);

  const home = useMemo(() => {
    if (homeContent?.homeHeroIntro) return homeContent;
    return HOME_CONTENT_FALLBACK;
  }, [homeContent]);

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
        <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8 py-8 sm:py-14 lg:py-32">
          <div className="max-w-2xl">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] sm:tracking-[0.25em] text-gold-600 mb-3 sm:mb-5">
              Natural care, refined
            </p>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold text-neutral-900 tracking-tight leading-[1.08]">
              Natural Care, Refined for Everyday Beauty.
            </h1>
            <p className="mt-4 sm:mt-6 text-sm sm:text-lg text-neutral-600 max-w-md leading-relaxed whitespace-pre-wrap">
              {home.homeHeroIntro}
            </p>
            <div className="mt-5 sm:mt-10 flex flex-wrap gap-2.5 sm:gap-4">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center rounded-xl sm:rounded-2xl bg-neutral-900 px-6 sm:px-8 py-3 sm:py-3.5 text-xs sm:text-sm font-medium text-white shadow-premium transition hover:bg-neutral-800 hover:shadow-gold-md focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:ring-offset-2"
              >
                Shop now
              </Link>
              <Link
                href="/blog"
                className="inline-flex items-center justify-center rounded-xl sm:rounded-2xl border-2 border-neutral-300 bg-white px-6 sm:px-8 py-3 sm:py-3.5 text-xs sm:text-sm font-medium text-neutral-900 transition hover:border-gold-400/60 hover:bg-gold-50/50"
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
                  fetchPriority={i === 0 ? 'high' : 'low'}
                  sizes="(max-width: 1024px) 0, 600px"
                  quality={75}
                  decoding="async"
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
        <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8 py-3 sm:py-5 lg:py-7">
          <ul className="flex flex-wrap justify-center gap-3 sm:gap-6 lg:gap-14 text-xs sm:text-sm text-neutral-500">
            {TRUST_BADGES.map((b) => (
              <li key={b.id} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold-400/70 shrink-0" aria-hidden />
                {b.text}
              </li>
            ))}
          </ul>
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
