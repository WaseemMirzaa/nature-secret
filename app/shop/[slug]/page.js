'use client';

import { useParams } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useProductsStore, useCartStore, useCartOpenStore, useWishlistStore, useCurrencyStore } from '@/lib/store';
import { SHIPPING_POLICY, RETURN_POLICY } from '@/lib/constants';
import { trackViewContent, trackAddToCart, trackOutOfStockView } from '@/lib/analytics';
import { formatPrice } from '@/lib/currency';
import { getProductBySlug } from '@/lib/api';

export default function ProductPage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : '';
  const storeProducts = useProductsStore((s) => s.products);
  const [apiProduct, setApiProduct] = useState(null);
  const [productLoading, setProductLoading] = useState(!!slug);

  useEffect(() => {
    if (!slug) {
      setProductLoading(false);
      return;
    }
    getProductBySlug(slug)
      .then((p) => { setApiProduct(p); })
      .catch(() => { setApiProduct(null); })
      .finally(() => setProductLoading(false));
  }, [slug]);

  const productFromStore = useMemo(() => (slug ? storeProducts.find((p) => p.slug === slug) : null), [storeProducts, slug]);
  const product = apiProduct ?? productFromStore;
  const products = apiProduct ? [apiProduct, ...storeProducts.filter((p) => p.id !== apiProduct.id)] : storeProducts;
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [faqOpen, setFaqOpen] = useState(null);
  const [zoom, setZoom] = useState(false);

  const variant = selectedVariant ?? product?.variants?.[0];
  const price = variant?.price ?? product?.price;
  const mainImage = variant?.image ?? product?.images?.[0];
  const currency = useCurrencyStore((s) => s.currency);

  useEffect(() => {
    if (product) {
      trackViewContent(product.id, product.name, product.price / 100);
      if ((product.inventory ?? 0) === 0) trackOutOfStockView(product.id);
    }
  }, [product]);

  const addToCart = useCartStore((s) => s.addItem);
  const openCart = useCartOpenStore((s) => s.open);
  const wishlist = useWishlistStore((s) => s.productIds);
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  const related = useMemo(() => {
    if (!product) return [];
    return products.filter((p) => p.categoryId === product.categoryId && p.id !== product.id).slice(0, 4);
  }, [product, products]);

  if (productLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-neutral-500">Loading…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-neutral-600">This product isn&apos;t available or the catalog is updating. Try again later or browse the shop.</p>
        <Link href="/shop" className="mt-4 inline-block text-sm font-medium text-gold-700 hover:text-gold-600 border-b border-gold-500/40 pb-0.5">Back to shop</Link>
      </div>
    );
  }

  function handleAddToCart() {
    if (!variant) return;
    addToCart({
      productId: product.id,
      variantId: variant.id,
      price: variant.price,
      name: product.name,
      image: variant.image || product.images?.[0],
      qty: 1,
    });
    openCart();
    trackAddToCart(product.id, product.name, variant.price / 100, 1);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
        <div className="relative">
          <div
            className="aspect-[4/5] rounded-2xl overflow-hidden bg-neutral-100 relative"
            onMouseEnter={() => setZoom(true)}
            onMouseLeave={() => setZoom(false)}
          >
            <Image
              src={mainImage}
              alt={product.name}
              fill
              className={`object-cover transition-transform duration-300 ${zoom ? 'scale-110' : ''}`}
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {[mainImage, ...product.images.filter((u) => u !== mainImage)].slice(0, 4).map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedVariant(product.variants?.find((v) => v.image === url) ?? null)}
                className="relative h-20 w-20 flex-shrink-0 rounded-xl overflow-hidden border-2 border-neutral-300"
              >
                <Image src={url} alt="" fill className="object-cover" sizes="80px" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gold-600">{product.categoryId}</p>
          {(product.badge || product.badgeSub) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {product.badge && (
                <span className="inline-block rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium uppercase tracking-wider text-white ring-1 ring-gold-500/50">
                  {product.badge}
                </span>
              )}
              {product.badgeSub && (
                <span className="inline-block rounded-full border border-gold-500/60 bg-gold-50 px-3 py-1 text-xs font-medium uppercase tracking-wider text-neutral-900">
                  {product.badgeSub}
                </span>
              )}
            </div>
          )}
          <h1 className="mt-2 text-3xl font-semibold text-neutral-900">{product.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-gold-600">{'★'.repeat(5)}</span>
            <span className="text-sm text-neutral-500">({product.reviewCount} reviews)</span>
          </div>
          <p className="mt-4 text-2xl font-medium text-neutral-900">
            {product.compareAtPrice && (
              <span className="text-neutral-400 line-through mr-2">{formatPrice(product.compareAtPrice, currency)}</span>
            )}
            {formatPrice(price, currency)}
          </p>
          <p className="mt-4 text-neutral-600">{product.description}</p>

          {product.variants?.length > 1 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-neutral-700 mb-2">Variant</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariant(v)}
                    className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                      variant?.id === v.id ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 text-neutral-700 hover:border-neutral-400'
                    }`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-4">
            {product.inventory === 0 ? (
              <span className="flex-1 min-w-[200px] rounded-2xl border border-neutral-200 bg-neutral-100 py-3.5 text-center text-sm font-medium text-neutral-500">Out of stock</span>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 min-w-[200px] rounded-2xl bg-neutral-900 py-3.5 text-sm font-medium text-white hover:bg-neutral-800 transition"
              >
                Add to cart
              </button>
            )}
            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              className="p-3 rounded-2xl border border-neutral-300 hover:bg-neutral-50"
              aria-label="Wishlist"
            >
              <svg className="w-5 h-5 text-neutral-600" fill={wishlist.includes(product.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </button>
          </div>

          <ul className="mt-8 space-y-2">
            {product.benefits?.map((b, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-neutral-600">
                <span className="text-gold-600">✓</span> {b}
              </li>
            ))}
          </ul>

          <div className="mt-10 border-t border-neutral-200 pt-8">
            <h3 className="text-sm font-medium text-neutral-900 mb-3">FAQ</h3>
            <ul className="space-y-2">
              {product.faq?.map((item, i) => (
                <li key={i} className="border-b border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                    className="w-full py-3 text-left text-sm font-medium text-neutral-700 flex justify-between"
                  >
                    {item.q}
                    <span>{faqOpen === i ? '−' : '+'}</span>
                  </button>
                  {faqOpen === i && <p className="pb-3 text-sm text-neutral-500">{item.a}</p>}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 rounded-2xl bg-neutral-100 p-4 text-sm text-neutral-600 space-y-2">
            <p><strong>Shipping:</strong> {SHIPPING_POLICY}</p>
            <p><strong>Returns:</strong> {RETURN_POLICY}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-4 text-xs text-neutral-500">
            <span>Secure payment</span>
            <span>Authentic & organic</span>
            <span>30-day returns</span>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20 pt-16 border-t border-neutral-200">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-8">You may also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {related.map((p) => (
              <Link key={p.id} href={`/shop/${p.slug}`} className="group">
                <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-100">
                  <Image src={p.images[0]} alt={p.name} width={300} height={400} className="h-full w-full object-cover group-hover:scale-105 transition duration-300" />
                </div>
                <p className="mt-3 font-medium text-neutral-900">{p.name}</p>
                <p className="text-sm text-neutral-500">{formatPrice(p.price, currency)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
