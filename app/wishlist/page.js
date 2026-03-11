'use client';

import Link from '@/components/Link';
import Image from 'next/image';
import { useWishlistStore, useProductsStore } from '@/lib/store';
import { useCartStore, useCartOpenStore } from '@/lib/store';
import { HeartIcon } from '@/components/icons/HeartIcon';
import { formatPrice } from '@/lib/currency';
import { useProductsAndCategories } from '@/lib/useApiData';

export default function WishlistPage() {
  const productIds = useWishlistStore((s) => s.productIds);
  const toggle = useWishlistStore((s) => s.toggle);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartOpenStore((s) => s.open);
  const storeProducts = useProductsStore((s) => s.products);
  const { products: allProducts } = useProductsAndCategories(storeProducts);
  const products = (allProducts || []).filter((p) => productIds.includes(p.id));

  if (productIds.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-neutral-600">Your wishlist is empty.</p>
        <Link href="/shop" className="mt-4 inline-block font-medium text-neutral-900">Discover products</Link>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-neutral-600">We couldn&apos;t load your wishlist items right now. Try again later.</p>
        <Link href="/shop" className="mt-4 inline-block font-medium text-neutral-900">Browse shop</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900 mb-8">Wishlist</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((p) => {
          const v = p.variants?.[0];
          const price = v?.price ?? p.price;
          const compareAtPrice = p.variants?.length > 1 ? v?.compareAtPrice : p.compareAtPrice;
          const img = p.images?.[0] || '/assets/nature-secret-logo.svg';
          const name = p.name ?? p.slug ?? 'Product';
          return (
            <article key={p.id} className="group relative">
              <Link href={`/shop/${(p.slug && p.slug.trim()) ? p.slug : p.id}`}>
                <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-100">
                  <Image src={img} alt={name} width={300} height={400} className="h-full w-full object-cover" unoptimized={!img.startsWith('http')} />
                </div>
                <p className="mt-3 font-medium text-neutral-900">{name}</p>
                <p className="text-sm text-neutral-500">
                  {compareAtPrice && <span className="line-through text-neutral-400 mr-1">{formatPrice(compareAtPrice, 'PKR')}</span>}
                  {formatPrice(price, 'PKR')}
                </p>
              </Link>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  className="p-2 rounded-lg border border-neutral-200 text-neutral-600 hover:text-neutral-900"
                  aria-label="Remove from wishlist"
                >
                  <HeartIcon className="w-5 h-5 fill-current" />
                </button>
                <button
                  type="button"
                  onClick={() => { if (v) { addItem({ productId: p.id, variantId: v.id, price: v.price }); openCart(); } }}
                  className="flex-1 rounded-lg border border-neutral-900 bg-neutral-900 text-white py-2 text-sm font-medium animate-cta-attract hover:animate-none transition"
                >
                  Add to cart
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
