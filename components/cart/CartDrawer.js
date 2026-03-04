'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore, useCartOpenStore, useProductsStore, useCurrencyStore } from '@/lib/store';
import { getDiscountCodes } from '@/lib/store';
import { formatPrice } from '@/lib/currency';
import { Logo } from '@/components/Logo';
import { useProductsAndCategories } from '@/lib/useApiData';

export function CartDrawer() {
  const isOpen = useCartOpenStore((s) => s.isOpen);
  const close = useCartOpenStore((s) => s.close);
  const { items, updateQty, removeItem } = useCartStore();
  const storeProducts = useProductsStore((s) => s.products);
  const { products } = useProductsAndCategories(storeProducts);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discountCodes = getDiscountCodes();
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const discountPercent = appliedDiscount ? (discountCodes[appliedDiscount] ?? 0) : 0;
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const total = subtotal - discountAmount;
  const shipping = total >= 99900 ? 0 : 9900; // Free over ₹999, else ₹99
  const totalWithShipping = total + shipping;

  function applyDiscount() {
    const code = discountCode.trim().toUpperCase();
    if (discountCodes[code] != null) setAppliedDiscount(code);
  }

  const currency = useCurrencyStore((s) => s.currency);
  const getProduct = (productId) => (products || []).find((p) => p.id === productId);
  const getVariant = (productId, variantId) => {
    const p = getProduct(productId);
    return p?.variants?.find((v) => v.id === variantId);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/20" aria-hidden onClick={close} />
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-premium flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <Logo className="h-7" />
            <span className="text-sm font-medium text-neutral-500">Your cart</span>
          </div>
          <button type="button" onClick={close} className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-500 hover:text-neutral-900 rounded-xl" aria-label="Close">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="text-neutral-500 text-sm">Your cart is empty.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const product = getProduct(item.productId);
                const variant = getVariant(item.productId, item.variantId);
                const img = variant?.image || product?.images?.[0];
                return (
                  <li key={`${item.productId}-${item.variantId}`} className="flex gap-4 border-b border-neutral-100 pb-4">
                    <div className="relative h-20 w-20 flex-shrink-0 rounded-xl overflow-hidden bg-neutral-100">
                      {img && <Image src={img} alt="" fill className="object-cover" sizes="80px" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900 truncate">{product?.name}</p>
                      {variant && <p className="text-xs text-neutral-500">{variant.name}</p>}
                      <p className="text-sm text-neutral-600 mt-1">{formatPrice(item.price, currency)} × {item.qty}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button type="button" onClick={() => updateQty(item.productId, item.variantId, item.qty - 1)} className="w-7 h-7 rounded border border-neutral-300 text-neutral-600">−</button>
                        <span className="w-6 text-center text-sm">{item.qty}</span>
                        <button type="button" onClick={() => updateQty(item.productId, item.variantId, item.qty + 1)} className="w-7 h-7 rounded border border-neutral-300 text-neutral-600">+</button>
                        <button type="button" onClick={() => removeItem(item.productId, item.variantId)} className="text-xs text-neutral-500 hover:text-red-600 ml-2">Remove</button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {items.length > 0 && (
          <div className="border-t border-neutral-200 p-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Discount code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              />
              <button type="button" onClick={applyDiscount} className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-medium">Apply</button>
            </div>
            {appliedDiscount && <p className="text-xs text-green-600">Code applied: {discountPercent}% off</p>}
            <div className="text-sm text-neutral-500">Subtotal: {formatPrice(subtotal, currency)}</div>
            {discountAmount > 0 && <div className="text-sm text-green-600">Discount: −{formatPrice(discountAmount, currency)}</div>}
            <div className="text-sm text-neutral-500">Shipping: {shipping === 0 ? 'Free' : formatPrice(shipping, currency)}</div>
            <div className="font-semibold text-neutral-900">Total: {formatPrice(totalWithShipping, currency)}</div>
            <Link href="/checkout" onClick={close} className="block w-full rounded-xl bg-neutral-900 text-white text-center py-3 font-medium">Checkout</Link>
          </div>
        )}
      </div>
    </>
  );
}
