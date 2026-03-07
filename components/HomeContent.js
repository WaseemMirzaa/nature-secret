'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useProductsStore } from '@/lib/store';
import { useProductsAndCategories } from '@/lib/useApiData';
import { formatPrice } from '@/lib/currency';
import { getSlider } from '@/lib/api';
import { TRUST_BADGES } from '@/lib/constants';

export default function HomeContent() {
  const storeProducts = useProductsStore((s) => s.products);
  const { products, categories } = useProductsAndCategories(storeProducts);
  const [slideIndex, setSlideIndex] = useState(0);
  const [heroSlides, setHeroSlides] = useState([]);
  const bestsellerProducts = Array.isArray(products) ? products.slice(0, 4) : [];
  const featuredCategories = Array.isArray(categories) ? categories.slice(0, 2) : [];

  useEffect(() => {
    getSlider()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setHeroSlides(list.map((s) => ({ id: s.id, src: s.imageUrl, alt: s.alt || '', title: s.title || '', href: s.href || '/shop' })));
        }
      })
      .catch(() => {});
  }, []);

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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-600 mb-5">
              Premium herbal oils for pain care
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-neutral-900 tracking-tight leading-[1.08]">
              Nature, refined.
            </h1>
            <p className="mt-6 text-lg text-neutral-600 max-w-md leading-relaxed">
              Our hero product is Painrex Oil—natural relief for muscle, joint and back pain. Skincare range coming soon. Clean ingredients, trusted in Pakistan.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
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
        {heroSlides.length > 0 && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-3/4 hidden lg:block">
          <div className="relative w-full h-full rounded-l-2xl overflow-hidden shadow-premium">
            {heroSlides.map((slide, i) => (
              <Link
                key={slide.id || i}
                href={slide.href}
                className={`absolute inset-0 transition-opacity duration-700 ${i === slideIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                aria-label={slide.title}
              >
                <Image src={slide.src} alt={slide.alt} fill className="object-cover" priority={i === 0} sizes="(max-width: 1024px) 0, 600px" unoptimized />
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
          </div>
        </div>
        )}
      </section>

      {/* Trust badges */}
      <section className="border-y border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-7">
          <ul className="flex flex-wrap justify-center gap-8 sm:gap-14 text-sm text-neutral-500">
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
      {(bestsellerProducts.length > 0) && (
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-12">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">Curated</p>
                <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900 mt-1">Bestsellers</h2>
                <p className="mt-1 text-neutral-500">Herbal oils and skincare—most loved by our community</p>
              </div>
              <Link href="/shop" className="text-sm font-medium text-neutral-900 border-b-2 border-gold-500/40 pb-0.5 hover:border-gold-500 transition-colors">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {bestsellerProducts.map((product) => {
                const img = (product.images && product.images[0]) || product.image || '';
                return (
                  <Link key={product.id} href={`/shop/${product.slug}`} className="group group/card">
                    <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-100 relative ring-1 ring-neutral-200/80 group-hover/card:ring-gold-400/40 transition-all duration-300 shadow-soft group-hover/card:shadow-gold-sm">
                      {img ? (
                        <Image
                          src={img}
                          alt={product.name}
                          width={400}
                          height={533}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-200" />
                      )}
                      {product.badge && (
                        <span className="absolute top-3 left-3 rounded-full bg-neutral-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white ring-1 ring-gold-500/60 shadow-gold-sm">
                          {product.badge}
                        </span>
                      )}
                    </div>
                    <div className="mt-4">
                      <p className="font-medium text-neutral-900 group-hover/card:text-gold-700 transition-colors">{product.name}</p>
                      <p className="mt-1 text-sm font-medium text-gold-700/90">{formatPrice(product.price, 'PKR')}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Featured categories */}
      {featuredCategories.length > 0 && (
        <section className="py-20 lg:py-28 bg-neutral-100/90">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 mb-2">Explore</p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900 mb-12">Collections</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                          unoptimized
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
      )}

      {/* Brand story */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-block w-10 h-px bg-gold-400/50 mb-5" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 mb-4">Our story</p>
            <h2 className="text-3xl sm:text-4xl font-semibold text-neutral-900 tracking-tight">
              Oils first. Skincare next.
            </h2>
            <p className="mt-6 text-neutral-600 leading-relaxed">
              We started with premium herbal oils for pain and wellness—our hero product Painrex Oil is trusted across Pakistan. We are now bringing the same clean, minimal approach to skincare: serums and care products coming soon.
            </p>
            <Link href="/about" className="mt-8 inline-block text-sm font-medium text-neutral-900 border-b-2 border-gold-500/50 pb-1 hover:border-gold-600 transition-colors">
              Learn more
            </Link>
          </div>
        </div>
      </section>


      {/* CTA */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-neutral-900 px-6 py-16 sm:py-20 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(203,168,71,0.4) 0%, transparent 50%)' }} aria-hidden />
            <div className="relative">
              <h2 className="text-2xl sm:text-3xl font-semibold text-white">Try our best-selling pain relief oil</h2>
              <p className="mt-3 text-neutral-300 max-w-md mx-auto">Painrex Oil—trusted across Pakistan for muscle, joint and back pain. Skincare range coming soon.</p>
              <Link
                href="/shop"
                className="mt-8 inline-flex items-center justify-center rounded-2xl bg-gold-500 px-8 py-3.5 text-sm font-semibold text-neutral-900 transition hover:bg-gold-400 shadow-gold-md focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-neutral-900"
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
