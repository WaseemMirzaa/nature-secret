'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/Link';
import Image from 'next/image';
import { useCartStore, useOrdersStore, useProductsStore, useCurrencyStore, useCustomerStore } from '@/lib/store';
import { getDiscountCodes } from '@/lib/store';
import {
  syncMetaPixelUserData,
  metaPurchaseFiredStorageKey,
  trackCheckoutPageView,
  trackInitiateCheckout,
  trackPlaceOrderClick,
  trackPurchase,
} from '@/lib/analytics';
import { formatPrice } from '@/lib/currency';
import { createOrder as apiCreateOrder, trackAnalytics } from '@/lib/api';
import { useProductsAndCategories } from '@/lib/useApiData';
import { CustomerPageLoader } from '@/components/ui/PageLoader';
import {
  getDiscountAmountForCode,
  getSessionDiscountCode,
  initNsPromoDeadline,
  isNsPromoCode,
  isNsPromoWindowActive,
  normalizePromoCode,
  NS_PROMO_CODE,
  NS_PROMO_DURATION_MINUTES,
  setSessionDiscountCode,
} from '@/lib/nsSessionPromo';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clear, updateQty } = useCartStore();
  const addOrder = useOrdersStore((s) => s.addOrder);
  const storeProducts = useProductsStore((s) => s.products);
  const customer = useCustomerStore((s) => s.customer);
  const { products } = useProductsAndCategories(storeProducts);
  const currency = useCurrencyStore((s) => s.currency);
  const [mounted, setMounted] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [form, setForm] = useState({
    email: '',
    name: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
  });
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [discountError, setDiscountError] = useState('');

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || items.length === 0) return;
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
  }, [mounted, items, subtotal]);

  useEffect(() => {
    if (!mounted || !appliedDiscount || !isNsPromoCode(appliedDiscount)) return;
    const id = setInterval(() => {
      if (!isNsPromoWindowActive()) {
        setAppliedDiscount(null);
        setSessionDiscountCode('');
      }
    }, 1000);
    return () => clearInterval(id);
  }, [mounted, appliedDiscount]);
  useEffect(() => {
    const onPop = () => router.back();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [router]);
  useEffect(() => {
    if (!mounted || !customer) return;
    setForm((f) => ({
      ...f,
      email: customer.email || f.email,
      name: customer.name || f.name,
      phone: customer.phone || f.phone,
      address: customer.address || f.address,
    }));
  }, [mounted, customer?.id]);

  const codes = getDiscountCodes();
  const discountAmount = getDiscountAmountForCode(subtotal, appliedDiscount, codes);
  const total = subtotal - discountAmount;
  const shipping = total >= 99900 ? 0 : 9900;
  const grandTotal = total + shipping;
  const metaCustomer = {
    email: form.email,
    name: form.name,
    phone: form.phone,
    city: form.city,
    pincode: form.pincode,
    country: 'pk',
  };

  useEffect(() => {
    if (!mounted) return;
    syncMetaPixelUserData(metaCustomer);
  }, [mounted, form.email, form.name, form.phone, form.city, form.pincode]);

  const lastInitiateCheckoutKeyRef = useRef(null);
  const lastCheckoutViewKeyRef = useRef(null);
  /** Meta InitiateCheckout: cart / totals only — not on every form keystroke. */
  useEffect(() => {
    if (!mounted || items.length === 0) return;
    const contentIds = items.map((i) => i.productId);
    const cartSig = items.map((i) => `${i.productId}:${i.variantId ?? ''}:${i.qty}`).join(';');
    const key = `${currency}|${grandTotal}|${cartSig}|${contentIds.join(',')}`;
    if (lastInitiateCheckoutKeyRef.current === key) return;
    lastInitiateCheckoutKeyRef.current = key;
    const numItems = items.reduce((n, i) => n + (i.qty || 1), 0);
    trackInitiateCheckout(grandTotal / 100, currency, contentIds, numItems);
  }, [mounted, items, grandTotal, currency]);

  useEffect(() => {
    if (!mounted || items.length === 0) return;
    const contentIds = items.map((i) => i.productId);
    const phoneDigits = String(form.phone || '').replace(/\D/g, '');
    const key = `${currency}|${grandTotal}|${contentIds.join(',')}|${form.email || ''}|${phoneDigits}`;
    if (lastCheckoutViewKeyRef.current === key) return;
    lastCheckoutViewKeyRef.current = key;
    trackCheckoutPageView(grandTotal / 100, currency, contentIds);
  }, [mounted, items, grandTotal, currency, form.email, form.name, form.phone, form.city, form.pincode]);

  function applyDiscount() {
    setDiscountError('');
    const code = normalizePromoCode(discountCode);
    if (!code) return;
    initNsPromoDeadline();
    const c = getDiscountCodes();
    if (isNsPromoCode(code)) {
      if (!isNsPromoWindowActive()) {
        setDiscountError(
          `This ${NS_PROMO_DURATION_MINUTES}-minute offer window has ended. You can still use other codes.`,
        );
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

  const getProduct = (id) => (Array.isArray(products) ? products.find((p) => p.id === id) : null);
  const getVariant = (productId, variantId) => {
    const p = getProduct(productId);
    return p?.variants?.find((v) => v.id === variantId);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (items.length === 0) return;
    const phoneDigits = String(form.phone || '').replace(/\D/g, '');
    if (phoneDigits.length <= 9) {
      setPhoneError('Phone number must be at least 10 digits.');
      return;
    }
    setPhoneError('');
    setPlacing(true);
    setOrderError('');
    const addressStr = `${form.address}, ${form.city}, ${form.pincode}`;
    const orderPayload = {
      customerName: form.name,
      email: form.email,
      phone: form.phone,
      address: addressStr,
      total: grandTotal,
      paymentMethod: 'cash_on_delivery',
      items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, qty: i.qty, price: i.price })),
    };
    let orderId;
    try {
      syncMetaPixelUserData(metaCustomer);
      trackPlaceOrderClick(grandTotal / 100, currency, items.map((i) => i.productId));
      const res = await apiCreateOrder(orderPayload);
      orderId = res?.id;
      if (!orderId) throw new Error('Order creation failed');
      addOrder({ id: orderId, ...orderPayload, status: 'pending' });
    } catch (err) {
      setPlacing(false);
      setOrderError(err?.body?.message || err?.message || 'Failed to place order. Please try again.');
      return;
    }
    syncMetaPixelUserData({ ...metaCustomer, externalId: orderId });
    const purchaseContentIds = items.map((i) => i.productId);
    const purchaseNumItems = items.reduce((n, i) => n + (i.qty || 1), 0);
    try {
      const dedupeKey = metaPurchaseFiredStorageKey(orderId);
      if (!sessionStorage.getItem(dedupeKey)) {
        trackPurchase(orderId, grandTotal / 100, currency, purchaseContentIds, purchaseNumItems);
        sessionStorage.setItem(dedupeKey, '1');
      }
    } catch (_) {
      trackPurchase(orderId, grandTotal / 100, currency, purchaseContentIds, purchaseNumItems);
    }
    try {
      localStorage.setItem(
        'nature_secret_last_order_meta_customer',
        JSON.stringify({ ...metaCustomer, externalId: orderId }),
      );
    } catch (_) {}
    try { await trackAnalytics({ type: 'purchase', orderId, sessionId: `sess-${Date.now()}`, payload: {} }); } catch (_) {}
    /** Let Meta Pixel send Purchase before Next.js navigates away (immediate push often drops the event). */
    await new Promise((r) => setTimeout(r, 400));
    clear();
    setPlacing(false);
    router.push(`/checkout/confirmation?order=${orderId}`);
  }

  if (!mounted) return <CustomerPageLoader message="Loading" />;

  if (items.length === 0 && !placing) {
    return (
      <div className="mx-auto max-w-lg px-3 sm:px-5 py-6 sm:py-14 lg:py-16 text-center">
        <p className="text-sm sm:text-base text-neutral-600">Your cart is empty.</p>
        <Link href="/shop" className="mt-4 inline-block font-medium text-neutral-900">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8 py-2.5 sm:py-4 lg:py-12 animate-slide-up max-lg:pb-[11rem] sm:max-lg:pb-[12rem]">
      <div className="mb-2 sm:mb-5 lg:mb-8">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-neutral-900">Checkout</h1>
        <p className="mt-0.5 lg:mt-1 text-[11px] sm:text-xs lg:text-sm text-neutral-500 leading-snug">Complete your order. Add email if you want order updates by email; we&apos;ll also reach you on your phone.</p>
      </div>
      <form
        id="checkout-form"
        onSubmit={handleSubmit}
        className="flex flex-col lg:grid lg:grid-cols-2 gap-4 md:gap-5 lg:gap-12"
      >
        <div className="order-2 lg:order-1 min-w-0">
          <h2 className="text-xs sm:text-sm font-medium text-neutral-900 mb-2 lg:mb-4 tracking-tight">Contact & delivery</h2>
          <div className="space-y-2 sm:space-y-2.5 lg:space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 sm:gap-2.5 lg:gap-4">
              <input
                type="email"
                autoComplete="email"
                placeholder="Email (optional)"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="min-w-0 w-full rounded-lg lg:rounded-xl border border-neutral-200 px-2.5 sm:px-3 py-2 sm:py-2.5 lg:px-4 lg:py-3 text-sm lg:text-base text-neutral-900"
              />
              <input
                type="tel"
                required
                minLength={10}
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => {
                  const next = e.target.value;
                  setForm((f) => ({ ...f, phone: next }));
                  if (String(next || '').replace(/\D/g, '').length > 9) setPhoneError('');
                }}
                className="min-w-0 w-full rounded-lg lg:rounded-xl border border-neutral-200 px-2.5 sm:px-3 py-2 sm:py-2.5 lg:px-4 lg:py-3 text-sm lg:text-base text-neutral-900"
              />
            </div>
            {phoneError && <p className="text-xs sm:text-sm text-red-600 -mt-1 lg:-mt-2">{phoneError}</p>}
            <input
              type="text"
              required
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg lg:rounded-xl border border-neutral-200 px-3 py-2 sm:py-2.5 lg:px-4 lg:py-3 text-sm lg:text-base text-neutral-900"
            />
            <textarea
              required
              placeholder="Address"
              rows={2}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full rounded-lg lg:rounded-xl border border-neutral-200 px-3 py-2 sm:py-2.5 lg:px-4 lg:py-3 text-sm lg:text-base text-neutral-900 min-h-[3.5rem] sm:min-h-[4rem] lg:min-h-0 resize-y"
            />
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:gap-4">
              <input
                type="text"
                required
                placeholder="City"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className="min-w-0 rounded-lg lg:rounded-xl border border-neutral-200 px-2.5 sm:px-3 py-2 sm:py-2.5 lg:px-4 lg:py-3 text-sm lg:text-base text-neutral-900"
              />
              <input
                type="text"
                required
                placeholder="Pincode"
                value={form.pincode}
                onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
                className="min-w-0 rounded-lg lg:rounded-xl border border-neutral-200 px-2.5 sm:px-3 py-2 sm:py-2.5 lg:px-4 lg:py-3 text-sm lg:text-base text-neutral-900"
              />
            </div>
          </div>
          <p className="mt-2 sm:mt-3 lg:mt-4 text-[11px] sm:text-xs lg:text-sm text-neutral-500">Payment: Cash on delivery.</p>
        </div>

        <div className="order-1 lg:order-2 min-w-0">
          <div className="rounded-xl lg:rounded-2xl border border-neutral-200 bg-neutral-50 p-3 sm:p-4 lg:p-6 lg:sticky lg:top-24 max-lg:shadow-sm">
            <h2 className="text-xs sm:text-sm font-medium text-neutral-900 mb-2 lg:mb-4 tracking-tight">Order summary</h2>
            <ul className="space-y-2 sm:space-y-2.5 lg:space-y-4 mb-2 sm:mb-3 lg:mb-4 max-lg:max-h-[min(42vh,260px)] max-lg:overflow-y-auto max-lg:overscroll-contain max-lg:-mr-1 max-lg:pr-1 touch-pan-y">
              {items.map((i) => {
                const p = getProduct(i.productId);
                const variant = getVariant(i.productId, i.variantId);
                const imgSrc = variant?.image || p?.images?.[0] || '/assets/nature-secret-logo.svg';
                const lineTotal = i.price * i.qty;
                return (
                  <li key={`${i.productId}-${i.variantId ?? 'default'}`} className="flex gap-2 sm:gap-2.5 lg:gap-3">
                    <div className="relative h-12 w-12 sm:h-[3.25rem] sm:w-[3.25rem] lg:h-14 lg:w-14 rounded-md lg:rounded-lg overflow-hidden bg-white flex-shrink-0">
                      <Image src={imgSrc} alt="" fill className="object-cover" sizes="56px" unoptimized={!imgSrc.startsWith('http')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-neutral-900 truncate leading-tight">{p?.name ?? i.name ?? 'Product'}{variant ? ` (${variant.name})` : ''}</p>
                      <div className="mt-1.5 sm:mt-2 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
                        <div className="inline-flex items-stretch rounded-lg border border-neutral-200 bg-white">
                          <button
                            type="button"
                            onClick={() => updateQty(i.productId, i.variantId, Math.max(0, i.qty - 1))}
                            className="w-8 h-8 shrink-0 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 rounded-l-md text-base leading-none"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <div className="flex min-w-[2.25rem] items-center justify-center border-x border-neutral-100 px-0.5">
                            <span className="text-sm font-semibold tabular-nums leading-none text-neutral-900">{i.qty}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateQty(i.productId, i.variantId, Math.min(99, i.qty + 1))}
                            className="w-8 h-8 shrink-0 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 rounded-r-md text-base leading-none"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-neutral-900 tabular-nums">
                          {variant?.compareAtPrice && (
                            <span className="line-through text-neutral-400 text-[10px] sm:text-xs mr-1">{formatPrice(variant.compareAtPrice * i.qty, currency)}</span>
                          )}
                          {formatPrice(lineTotal, currency)}
                        </p>
                      </div>
                      <p className="text-[10px] sm:text-xs text-neutral-500 mt-0.5">Each {formatPrice(i.price, currency)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-1.5 sm:gap-2 mb-2 sm:mb-3 lg:mb-4">
              <input
                type="text"
                placeholder="Discount code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                className="flex-1 rounded-lg lg:rounded-xl border border-neutral-200 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm min-w-0"
              />
              <button type="button" onClick={applyDiscount} className="shrink-0 rounded-lg lg:rounded-xl bg-neutral-900 text-white px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium">Apply</button>
            </div>
            {discountError && <p className="text-[11px] sm:text-xs text-red-600 mb-1.5 sm:mb-2">{discountError}</p>}
            {appliedDiscount && !discountError && (
              <p className="text-[11px] sm:text-xs text-green-600 mb-1.5 sm:mb-2">
                {isNsPromoCode(appliedDiscount) ? `${NS_PROMO_CODE} applied — Rs 150 off` : `Code applied (${codes[appliedDiscount]}% off)`}
              </p>
            )}
            <div className="space-y-1 sm:space-y-1.5 lg:space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between gap-2 text-neutral-600"><span>Subtotal</span><span className="tabular-nums shrink-0">{formatPrice(subtotal, currency)}</span></div>
              {discountAmount > 0 && <div className="flex justify-between gap-2 text-green-600"><span>Discount</span><span className="tabular-nums shrink-0">−{formatPrice(discountAmount, currency)}</span></div>}
              <div className="flex justify-between gap-2 text-neutral-600"><span>Shipping</span><span className="tabular-nums shrink-0">{shipping === 0 ? 'Free' : formatPrice(shipping, currency)}</span></div>
              <div className="flex justify-between gap-2 font-semibold text-neutral-900 pt-1.5 sm:pt-2 border-t border-neutral-200 text-sm sm:text-base"><span>Total</span><span className="tabular-nums shrink-0 text-base sm:text-lg">{formatPrice(grandTotal, currency)}</span></div>
            </div>
            {orderError && <p className="mt-2 sm:mt-3 lg:mt-4 text-xs sm:text-sm text-red-600">{orderError}</p>}
            <button
              type="submit"
              disabled={placing}
              className="mt-5 sm:mt-6 max-lg:hidden flex w-full min-h-[3.25rem] items-center justify-center rounded-2xl bg-neutral-900 px-8 py-3.5 text-[0.9375rem] font-semibold leading-snug tracking-tight text-white shadow-[0_6px_20px_-4px_rgba(0,0,0,0.35)] ring-1 ring-inset ring-white/[0.06] transition-all duration-200 hover:bg-neutral-800 hover:shadow-[0_10px_28px_-6px_rgba(0,0,0,0.42)] active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/55 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none animate-cta-attract hover:animate-none disabled:animate-none"
            >
              {placing ? 'Placing order…' : 'Place order (Cash on delivery)'}
            </button>
          </div>
        </div>
      </form>

      {/* Mobile / tablet: totals stacked above full-width place order */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        role="region"
        aria-label="Place order"
      >
        <div className="mx-auto max-w-7xl w-full px-3 sm:px-5 pt-3 sm:pt-4">
          {orderError && (
            <p className="text-[11px] sm:text-xs text-red-600 mb-2 leading-snug">{orderError}</p>
          )}
          <div className="space-y-1 text-xs text-neutral-600 mb-3">
            <div className="flex justify-between gap-3 tabular-nums">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal, currency)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between gap-3 tabular-nums text-green-700">
                <span>Discount</span>
                <span>−{formatPrice(discountAmount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between gap-3 tabular-nums">
              <span>Shipping</span>
              <span>{shipping === 0 ? 'Free' : formatPrice(shipping, currency)}</span>
            </div>
            <div className="flex justify-between items-end gap-3 pt-2 border-t border-neutral-200">
              <span className="text-sm font-semibold text-neutral-900">Total</span>
              <span className="text-xl sm:text-2xl font-bold text-neutral-900 tabular-nums tracking-tight">{formatPrice(grandTotal, currency)}</span>
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-5 pb-3 sm:pb-4">
          <button
            type="submit"
            form="checkout-form"
            disabled={placing}
            className="flex w-full min-h-[3.5rem] sm:min-h-[3.625rem] items-center justify-center rounded-2xl bg-neutral-900 px-6 py-3.5 text-[0.9375rem] sm:text-base font-semibold leading-snug tracking-tight text-white shadow-[0_6px_20px_-4px_rgba(0,0,0,0.35)] ring-1 ring-inset ring-white/[0.06] transition-all duration-200 hover:bg-neutral-800 hover:shadow-[0_10px_28px_-6px_rgba(0,0,0,0.42)] active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/55 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none animate-cta-attract hover:animate-none disabled:animate-none"
          >
            {placing ? 'Placing order…' : 'Place order · Cash on delivery'}
          </button>
        </div>
      </div>
    </div>
  );
}
