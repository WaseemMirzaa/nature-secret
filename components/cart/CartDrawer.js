'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from '@/components/Link';
import Image from 'next/image';
import { useCartStore, useCartOpenStore, useProductsStore, useCurrencyStore } from '@/lib/store';
import { getDiscountCodes } from '@/lib/store';
import {
  getDiscountAmountForCode,
  getSessionDiscountCode,
  initNsPromoDeadline,
  isNsPromoCode,
  isNsPromoWindowActive,
  normalizePromoCode,
  NS_PROMO_CODE,
  setSessionDiscountCode,
} from '@/lib/nsSessionPromo';
import { formatPrice } from '@/lib/currency';
import { Logo } from '@/components/Logo';
import { useProductsAndCategories } from '@/lib/useApiData';
import { overlayHistoryDismissIfTop, overlayHistoryDismissForNavigation, overlayHistoryOpen } from '@/lib/overlayHistory';

const OVERLAY_ID = 'nsCart';

export function CartDrawer() {
  const isOpen = useCartOpenStore((s) => s.isOpen);
  const close = useCartOpenStore((s) => s.close);
  const drawerWasOpenRef = useRef(false);

  const closeCart = useCallback(() => {
    overlayHistoryDismissIfTop(OVERLAY_ID, close);
  }, [close]);

  const closeCartForCheckoutNav = useCallback(() => {
    overlayHistoryDismissForNavigation(OVERLAY_ID, close);
  }, [close]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isOpen) {
      drawerWasOpenRef.current = false;
      return;
    }
    if (!drawerWasOpenRef.current) {
      overlayHistoryOpen(OVERLAY_ID, () => useCartOpenStore.getState().close());
    }
    drawerWasOpenRef.current = true;
  }, [isOpen]);

  const { items, updateQty, removeItem } = useCartStore();
  const storeProducts = useProductsStore((s) => s.products);
  const { products } = useProductsAndCategories(storeProducts);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discountCodes = getDiscountCodes();
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountError, setDiscountError] = useState('');
  const discountAmount = getDiscountAmountForCode(subtotal, appliedDiscount, discountCodes);
  const total = subtotal - discountAmount;
  const shipping = total >= 99900 ? 0 : 9900; // Free over ₹999, else ₹99
  const totalWithShipping = total + shipping;

  function applyDiscount() {
    setDiscountError('');
    const code = normalizePromoCode(discountCode);
    if (!code) return;
    initNsPromoDeadline();
    const c = getDiscountCodes();
    if (isNsPromoCode(code)) {
      if (!isNsPromoWindowActive()) {
        setDiscountError('Session offer expired.');
        return;
      }
      setAppliedDiscount(NS_PROMO_CODE);
      setSessionDiscountCode(NS_PROMO_CODE);
      return;
    }
    if (c[code] != null) {
      setAppliedDiscount(code);
      setSessionDiscountCode(code);
    } else {
      setDiscountError('Invalid code.');
    }
  }

  useEffect(() => {
    if (!isOpen || items.length === 0) return;
    initNsPromoDeadline();
    const saved = getSessionDiscountCode();
    if (!saved) return;
    const norm = normalizePromoCode(saved);
    const c = getDiscountCodes();
    if (isNsPromoCode(norm) && !isNsPromoWindowActive()) {
      setSessionDiscountCode('');
      setAppliedDiscount(null);
      return;
    }
    const d = getDiscountAmountForCode(subtotal, norm, c);
    if (d > 0 || (!isNsPromoCode(norm) && c[norm] != null)) {
      setAppliedDiscount(norm);
    }
  }, [isOpen, items, subtotal]);

  useEffect(() => {
    if (!isOpen || !appliedDiscount || !isNsPromoCode(appliedDiscount)) return;
    const id = setInterval(() => {
      if (!isNsPromoWindowActive()) {
        setAppliedDiscount(null);
        setSessionDiscountCode('');
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isOpen, appliedDiscount]);

  const currency = useCurrencyStore((s) => s.currency);
  const getProduct = (productId) => (products || []).find((p) => p.id === productId);
  const getVariant = (productId, variantId) => {
    const p = getProduct(productId);
    return p?.variants?.find((v) => v.id === variantId);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/20" aria-hidden onClick={closeCart} />
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-premium flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-neutral-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <Logo className="h-6 sm:h-7" />
            <span className="text-xs sm:text-sm font-medium text-neutral-500">Your cart</span>
          </div>
          <button type="button" onClick={closeCart} className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-500 hover:text-neutral-900 rounded-full sm:rounded-2xl" aria-label="Close">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {items.length === 0 ? (
            <p className="text-neutral-500 text-xs sm:text-sm">Your cart is empty.</p>
          ) : (
            <ul className="space-y-3 sm:space-y-4">
              {items.map((item) => {
                const product = getProduct(item.productId);
                const variant = getVariant(item.productId, item.variantId);
                const img = variant?.image || product?.images?.[0] || '/assets/nature-secret-logo.svg';
                const displayName = product?.name ?? item.name ?? 'Product';
                return (
                  <li key={`${item.productId}-${item.variantId}`} className="flex gap-3 sm:gap-4 border-b border-neutral-100 pb-3 sm:pb-4">
                    <div className="relative h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 rounded-lg sm:rounded-xl overflow-hidden bg-neutral-100">
                      <Image src={img} alt="" fill className="object-cover" sizes="80px" unoptimized={!img.startsWith('http')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900 text-sm sm:text-base truncate">{displayName}</p>
                      {variant && <p className="text-[11px] sm:text-xs text-neutral-500">{variant.name}</p>}
                      <p className="text-xs sm:text-sm text-neutral-600 mt-1">
                        {variant?.compareAtPrice && <span className="line-through text-neutral-500 mr-1">{formatPrice(variant.compareAtPrice, currency)}</span>}
                        {formatPrice(item.price, currency)} × {item.qty}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button type="button" onClick={() => updateQty(item.productId, item.variantId, item.qty - 1)} className="w-7 h-7 rounded-full border border-neutral-300 text-neutral-600">−</button>
                        <span className="w-6 text-center text-sm">{item.qty}</span>
                        <button type="button" onClick={() => updateQty(item.productId, item.variantId, item.qty + 1)} className="w-7 h-7 rounded-full border border-neutral-300 text-neutral-600">+</button>
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
          <div className="border-t border-neutral-200 p-3 sm:p-4 space-y-2.5 sm:space-y-3">
            <div className="rounded-xl border border-neutral-200/90 bg-accent-cream p-2 sm:p-2.5">
              <div className="flex gap-2">
                <input
                  id="cart-drawer-discount-code"
                  name="discountCode"
                  type="text"
                  autoComplete="off"
                  placeholder="Discount code"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  className="flex-1 rounded-lg sm:rounded-xl border border-neutral-300 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm"
                />
                <button type="button" onClick={applyDiscount} className="btn-gold-primary rounded-full sm:rounded-2xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-white shrink-0">Apply</button>
              </div>
            </div>
            {discountError && <p className="text-xs text-red-600">{discountError}</p>}
            {appliedDiscount && !discountError && (
              <p className="text-xs text-green-600">
                {isNsPromoCode(appliedDiscount)
                  ? `${NS_PROMO_CODE} — Rs 150 off`
                  : `Code applied: ${discountCodes[appliedDiscount]}% off`}
              </p>
            )}
            <div className="text-xs sm:text-sm text-neutral-500">Subtotal: {formatPrice(subtotal, currency)}</div>
            {discountAmount > 0 && <div className="text-xs sm:text-sm text-green-600">Discount: −{formatPrice(discountAmount, currency)}</div>}
            <div className="text-xs sm:text-sm text-neutral-500">Shipping: {shipping === 0 ? 'Free' : formatPrice(shipping, currency)}</div>
            <div className="text-sm sm:text-base font-semibold text-neutral-900">Total: {formatPrice(totalWithShipping, currency)}</div>
            <Link href="/checkout" onClick={closeCartForCheckoutNav} className="btn-gold-primary block w-full rounded-full sm:rounded-2xl text-center py-2.5 sm:py-3 text-sm font-semibold text-white animate-cta-attract hover:animate-none transition">Checkout</Link>
          </div>
        )}
      </div>
    </>
  );
}
