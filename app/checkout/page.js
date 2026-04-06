'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/Link';
import Image from 'next/image';
import { useCartStore, useOrdersStore, useProductsStore, useCurrencyStore, useCustomerStore } from '@/lib/store';
import { getDiscountCodes } from '@/lib/store';
import {
  metaPurchaseFiredStorageKey,
  metaContentId,
  metaPixelAdvertisingId,
  trackCheckoutPageView,
  trackInitiateCheckout,
  trackPlaceOrderClick,
  trackPurchase,
} from '@/lib/analytics';
import { formatPrice } from '@/lib/currency';
import { createOrder as apiCreateOrder } from '@/lib/api';
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
  const formRef = useRef(null);
  const phoneFieldRef = useRef(null);
  const orderErrorRef = useRef(null);

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
    if (!mounted || !customer) return;
    setForm((f) => ({
      ...f,
      email: customer.email || f.email,
      name: customer.name || f.name,
      phone: customer.phone || f.phone,
      address: customer.address || f.address,
    }));
  }, [mounted, customer?.id]);

  useEffect(() => {
    if (!orderError) return;
    orderErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [orderError]);

  const codes = getDiscountCodes();
  const discountAmount = getDiscountAmountForCode(subtotal, appliedDiscount, codes);
  const total = subtotal - discountAmount;
  const shipping = total >= 99900 ? 0 : 9900;
  const grandTotal = total + shipping;
  const metaCustomer = {
    email: form.email,
    name: form.name,
    phone: form.phone,
    address: form.address,
    city: form.city,
    pincode: form.pincode,
    country: 'pk',
  };

  const getProduct = (id) => (Array.isArray(products) ? products.find((p) => p.id === id) : null);
  /** CAPI + custom Pixel / internal store */
  const metaIdForProduct = (productId) => {
    const p = getProduct(productId);
    return p ? metaContentId(p) : String(productId);
  };
  /** Meta standard Pixel content_ids only */
  const pixelStdIdForProduct = (productId) => {
    const p = getProduct(productId);
    return p ? metaPixelAdvertisingId(p) : '';
  };
  const metaCategoryIdForProduct = (productId) => {
    const p = getProduct(productId);
    const id = p?.categoryAdvertisingId || p?.categoryId;
    return id ? String(id) : '';
  };
  const getVariant = (productId, variantId) => {
    const p = getProduct(productId);
    return p?.variants?.find((v) => v.id === variantId);
  };

  const lastInitiateCheckoutKeyRef = useRef(null);
  const lastCheckoutViewKeyRef = useRef(null);
  /** Meta InitiateCheckout: cart / totals only — not on every form keystroke. */
  useEffect(() => {
    if (!mounted || items.length === 0) return;
    const contentIds = items.map((i) => pixelStdIdForProduct(i.productId)).filter(Boolean);
    const customContentIds = items.map((i) => metaIdForProduct(i.productId));
    const categoryIds = Array.from(
      new Set(items.map((i) => metaCategoryIdForProduct(i.productId)).filter(Boolean)),
    );
    const cartSig = items.map((i) => `${i.productId}:${i.variantId ?? ''}:${i.qty}`).join(';');
    const key = `${currency}|${grandTotal}|${cartSig}|${contentIds.join(',')}`;
    if (lastInitiateCheckoutKeyRef.current === key) return;
    lastInitiateCheckoutKeyRef.current = key;
    const numItems = items.reduce((n, i) => n + (i.qty || 1), 0);
    const standardContents =
      items.length > 0 && items.every((i) => Boolean(pixelStdIdForProduct(i.productId)))
        ? items.map((i) => ({
            id: pixelStdIdForProduct(i.productId),
            quantity: Math.max(1, Number(i.qty) || 1),
          }))
        : null;
    trackInitiateCheckout(
      grandTotal / 100,
      currency,
      contentIds,
      numItems,
      customContentIds,
      categoryIds,
      standardContents,
    );
  }, [mounted, items, grandTotal, currency]);

  useEffect(() => {
    if (!mounted || items.length === 0) return;
    const contentIds = items.map((i) => pixelStdIdForProduct(i.productId)).filter(Boolean);
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

  function removeDiscount() {
    setDiscountError('');
    setAppliedDiscount(null);
    setDiscountCode('');
    setSessionDiscountCode('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const hpEl = formEl?.querySelector?.('input[name="website"]');
    const hpVal = hpEl && 'value' in hpEl ? String(hpEl.value).trim() : '';
    if (hpVal !== '') {
      return;
    }
    if (formEl && typeof formEl.checkValidity === 'function' && !formEl.checkValidity()) {
      const first = formEl.querySelector(':invalid');
      if (first instanceof HTMLElement) {
        first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        first.focus({ preventScroll: true });
      }
      formEl.reportValidity();
      return;
    }
    if (items.length === 0) return;
    const phoneDigits = String(form.phone || '').replace(/\D/g, '');
    if (phoneDigits.length <= 9) {
      setPhoneError('Phone number must be at least 10 digits.');
      const phoneInput = formRef.current?.querySelector('input[name="phone"]');
      if (phoneInput instanceof HTMLElement) {
        phoneInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        phoneInput.focus({ preventScroll: true });
      }
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
      website: '',
      items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, qty: i.qty, price: i.price })),
    };
    let orderId;
    const formattedTotal = Number((grandTotal / 100).toFixed(2));
    const formattedCurrency = String(currency || 'USD').toUpperCase();
    try {
      trackPlaceOrderClick(
        formattedTotal,
        formattedCurrency,
        items.map((i) => pixelStdIdForProduct(i.productId)).filter(Boolean),
      );
      const res = await apiCreateOrder(orderPayload);
      orderId = res?.id;
      if (!orderId) throw new Error('Order creation failed');
      addOrder({ id: orderId, ...orderPayload, status: 'pending' });
    } catch (err) {
      setPlacing(false);
      setOrderError(err?.body?.message || err?.message || 'Failed to place order. Please try again.');
      return;
    }
    const purchaseContentIds = items.map((i) => metaIdForProduct(i.productId));
    const purchasePixelStdIds = items.map((i) => pixelStdIdForProduct(i.productId)).filter(Boolean);
    const purchaseCategoryIds = Array.from(
      new Set(items.map((i) => metaCategoryIdForProduct(i.productId)).filter(Boolean)),
    );
    const purchaseNumItems = items.reduce((n, i) => n + (i.qty || 1), 0);
    const purchaseStandardContents =
      items.length > 0 && items.every((i) => Boolean(pixelStdIdForProduct(i.productId)))
        ? items.map((i) => ({
            id: pixelStdIdForProduct(i.productId),
            quantity: Math.max(1, Number(i.qty) || 1),
          }))
        : null;
    try {
      const dedupeKey = metaPurchaseFiredStorageKey(orderId);
      if (!sessionStorage.getItem(dedupeKey)) {
        trackPurchase(
          orderId,
          formattedTotal,
          formattedCurrency,
          purchaseContentIds,
          purchaseCategoryIds,
          purchaseNumItems,
          { ...metaCustomer, externalId: orderId, orderId },
          purchasePixelStdIds,
          purchaseStandardContents,
          'product',
        );
        sessionStorage.setItem(dedupeKey, '1');
      }
    } catch (_) {
      trackPurchase(
        orderId,
        formattedTotal,
        formattedCurrency,
        purchaseContentIds,
        purchaseCategoryIds,
        purchaseNumItems,
        { ...metaCustomer, externalId: orderId, orderId },
        purchasePixelStdIds,
        purchaseStandardContents,
        'product',
      );
    }
    try {
      localStorage.setItem(
        'nature_secret_last_order_meta_customer',
        JSON.stringify({ ...metaCustomer, externalId: orderId, orderId }),
      );
    } catch (_) {}
    /** Let Meta Pixel send Purchase before Next.js navigates away (immediate push often drops the event). */
    await new Promise((r) => setTimeout(r, 400));
    clear();
    setPlacing(false);
    router.push(`/checkout/confirmation?order=${orderId}`);
  }

  const itemCount = items.reduce((n, i) => n + (i.qty || 0), 0);
  const firstLine = items[0];
  const firstProduct = firstLine ? getProduct(firstLine.productId) : null;
  const firstVariant = firstLine ? getVariant(firstLine.productId, firstLine.variantId) : null;
  const firstThumb =
    firstLine &&
    (firstVariant?.image || firstProduct?.images?.[0] || '/assets/nature-secret-logo.svg');

  if (!mounted) return <CustomerPageLoader message="Loading" />;

  const fieldClass =
    'w-full rounded-xl border-2 border-gold-200/90 bg-gradient-to-b from-white to-gold-50/[0.45] px-3 py-2.5 text-sm leading-snug text-neutral-900 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85)] placeholder:text-neutral-400 transition-all duration-200 hover:border-gold-400/80 hover:shadow-[0_4px_14px_-6px_rgba(203,168,71,0.35)] focus:border-gold-600 focus:bg-white focus:shadow-[0_0_0_3px_rgba(203,168,71,0.18)] focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 lg:px-3.5 lg:py-3 lg:text-[0.9375rem]';

  const labelClass = 'block mb-1 text-[11px] font-bold uppercase tracking-wide text-neutral-700';

  if (items.length === 0 && !placing) {
    return (
      <div className="mx-auto max-w-lg px-3 sm:px-5 py-6 sm:py-14 lg:py-16 text-center">
        <p className="text-sm sm:text-base text-neutral-600">Your cart is empty.</p>
        <Link href="/shop" className="mt-4 inline-block font-medium text-gold-800 hover:text-gold-700">
          Continue shopping
        </Link>
      </div>
    );
  }

  const ctaBase =
    'inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 px-6 py-3.5 text-[0.9375rem] font-semibold text-white shadow-[0_8px_28px_-6px_rgba(0,0,0,0.45),0_0_0_1px_rgba(203,168,71,0.15)] ring-1 ring-inset ring-white/10 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_36px_-8px_rgba(203,168,71,0.4)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 disabled:hover:scale-100 motion-reduce:transition-none motion-reduce:hover:scale-100';

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-5 lg:px-8 py-4 sm:py-6 lg:py-12 max-lg:pb-36 lg:pb-16">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4 animate-checkout-enter motion-reduce:animate-none motion-reduce:opacity-100">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-700/90 mb-1">Almost there</p>
          <h1 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-tight">Complete your order</h1>
          <p className="mt-2 text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-md">
            Pay cash on delivery when it arrives — delivery in 5–7 business days.
          </p>
        </div>
        {!customer && (
          <Link
            href="/login"
            className="text-sm font-semibold text-gold-800 hover:text-gold-700 border-b-2 border-gold-400/60 pb-0.5 shrink-0 self-start transition-colors"
          >
            Sign in
          </Link>
        )}
      </div>
      <form ref={formRef} id="checkout-form" onSubmit={handleSubmit}>
        <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_min(20rem,32%)] lg:gap-x-8 xl:grid-cols-[minmax(0,1fr)_min(22rem,380px)] xl:gap-x-12 lg:items-start">
          <div className="space-y-6 lg:space-y-7 min-w-0">
        <section
          id="checkout-contact"
          className="scroll-mt-24 animate-checkout-enter checkout-enter-delay-1 motion-reduce:animate-none motion-reduce:opacity-100 rounded-2xl border border-gold-200/50 bg-gradient-to-br from-white via-white to-gold-50/30 p-3.5 shadow-[0_4px_24px_-12px_rgba(203,168,71,0.2)] sm:p-4"
        >
          <h2 className="text-xs font-bold text-neutral-900 border-l-[3px] border-gold-500 pl-2.5 mb-3">
            Contact & delivery
          </h2>
          <div className="space-y-3 sm:space-y-3.5">
            {/* Honeypot: hidden; if filled, submit is rejected client-side (no Meta/API). */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="checkout-hp-website">Company website</label>
              <input
                id="checkout-hp-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                defaultValue=""
              />
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
              <div className="min-w-0 lg:order-2">
                <label htmlFor="checkout-phone" className={labelClass}>
                  Phone
                </label>
                <input
                  ref={phoneFieldRef}
                  id="checkout-phone"
                  type="tel"
                  name="phone"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  minLength={10}
                  placeholder="Phone number"
                  value={form.phone}
                  onChange={(e) => {
                    const next = e.target.value;
                    setForm((f) => ({ ...f, phone: next }));
                    if (String(next || '').replace(/\D/g, '').length > 9) setPhoneError('');
                  }}
                  className={`min-w-0 ${fieldClass}`}
                  aria-describedby="checkout-phone-hint"
                />
                <p id="checkout-phone-hint" className="mt-1 text-[11px] font-medium text-gold-800/80">
                  At least 10 digits
                </p>
              </div>
              <div className="min-w-0 lg:order-1">
                <label htmlFor="checkout-email" className={labelClass}>
                  Email
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  placeholder="Email for order updates"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={`min-w-0 ${fieldClass}`}
                />
              </div>
            </div>
            {phoneError && <p className="text-xs sm:text-sm text-red-600 font-medium">{phoneError}</p>}
            <div>
              <label htmlFor="checkout-full-name" className={labelClass}>
                Full name
              </label>
              <input
                id="checkout-full-name"
                type="text"
                name="name"
                autoComplete="name"
                required
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="checkout-address" className={labelClass}>
                Address
              </label>
              <textarea
                id="checkout-address"
                name="address"
                autoComplete="street-address"
                required
                placeholder="Street, area, landmark"
                rows={2}
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className={`${fieldClass} min-h-[4.5rem] sm:min-h-[4.25rem] lg:min-h-[5.5rem] resize-y`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5 lg:gap-4">
              <div className="min-w-0">
                <label htmlFor="checkout-city" className={labelClass}>
                  City
                </label>
                <input
                  id="checkout-city"
                  type="text"
                  name="city"
                  autoComplete="address-level2"
                  required
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className={`min-w-0 ${fieldClass}`}
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="checkout-pincode" className={labelClass}>
                  Pincode
                </label>
                <input
                  id="checkout-pincode"
                  type="text"
                  name="pincode"
                  autoComplete="postal-code"
                  required
                  placeholder="Pincode"
                  value={form.pincode}
                  onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
                  className={`min-w-0 ${fieldClass}`}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="animate-checkout-enter checkout-enter-delay-2 motion-reduce:animate-none motion-reduce:opacity-100 rounded-2xl border border-gold-200/50 bg-gradient-to-br from-white to-gold-50/20 p-3.5 shadow-[0_4px_24px_-12px_rgba(203,168,71,0.15)] sm:p-4">
          <h2 className="text-xs font-bold text-neutral-900 border-l-[3px] border-gold-500 pl-2.5 mb-2.5">Shipping method</h2>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200/90 bg-gradient-to-br from-neutral-50 to-white px-3 py-3.5 sm:px-4 text-sm">
            <span className="font-medium text-neutral-800">Standard</span>
            <span className="font-semibold tabular-nums text-neutral-900">
              {shipping === 0 ? 'Free' : formatPrice(shipping, currency)}
            </span>
          </div>
          <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
            {shipping === 0 ? 'Free shipping on this order.' : 'Standard delivery 5–7 business days.'}
          </p>
        </section>

        <section className="animate-checkout-enter checkout-enter-delay-3 motion-reduce:animate-none motion-reduce:opacity-100 rounded-2xl border border-gold-200/50 bg-gradient-to-br from-white to-gold-50/20 p-3.5 shadow-[0_4px_24px_-12px_rgba(203,168,71,0.15)] sm:p-4">
          <h2 className="text-xs font-bold text-neutral-900 border-l-[3px] border-gold-500 pl-2.5 mb-1">Payment</h2>
          <p className="text-xs text-neutral-500 mb-3">All transactions are secure. Pay when your order arrives.</p>
          <div className="rounded-xl border border-gold-300/70 bg-gradient-to-br from-gold-50/90 to-amber-50/40 px-3 py-3.5 sm:px-4 text-sm font-semibold text-neutral-900 shadow-gold-sm">
            Cash on delivery (COD)
          </div>
        </section>

        <section className="animate-checkout-enter checkout-enter-delay-4 motion-reduce:animate-none motion-reduce:opacity-100 rounded-2xl border border-gold-200/50 bg-gradient-to-br from-white to-gold-50/20 p-3.5 shadow-[0_4px_24px_-12px_rgba(203,168,71,0.15)] sm:p-4">
          <h2 className="text-xs font-bold text-neutral-900 border-l-[3px] border-gold-500 pl-2.5 mb-2.5">Discount</h2>
          <div className="flex gap-2 items-stretch">
            <input
              id="checkout-discount-code"
              type="text"
              name="discountCode"
              autoComplete="off"
              placeholder="Code"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              className={`flex-1 min-w-0 ${fieldClass}`}
            />
            <button
              type="button"
              onClick={applyDiscount}
              className="shrink-0 self-stretch rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-800 px-4 py-2.5 text-sm font-bold text-white shadow-md ring-1 ring-gold-500/20 transition hover:scale-[1.02] active:scale-[0.98] motion-reduce:hover:scale-100"
            >
              Apply
            </button>
          </div>
          {discountError && <p className="mt-2 text-xs font-medium text-red-600">{discountError}</p>}
          {appliedDiscount && !discountError && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50/90 border border-emerald-200/60 px-3 py-2">
              <p className="text-xs font-medium text-emerald-800">
                {isNsPromoCode(appliedDiscount)
                  ? `${NS_PROMO_CODE} applied — Rs 150 off`
                  : `Code applied (${codes[appliedDiscount]}% off)`}
              </p>
              <button
                type="button"
                onClick={removeDiscount}
                className="text-xs font-semibold text-emerald-900/80 underline underline-offset-2 hover:text-emerald-950"
              >
                Remove
              </button>
            </div>
          )}
        </section>
          </div>

        <aside className="mt-7 space-y-4 lg:mt-0 lg:sticky lg:top-24 lg:self-start animate-checkout-enter checkout-enter-delay-5 motion-reduce:animate-none motion-reduce:opacity-100 min-w-0">
          <section className="rounded-2xl border border-gold-200/50 bg-gradient-to-b from-gold-50/40 via-white to-white p-3 sm:p-4 shadow-[0_4px_24px_-12px_rgba(203,168,71,0.18)]">
          <h2 className="text-xs font-bold text-neutral-900 border-l-[3px] border-gold-500 pl-2.5 mb-2.5">Order summary</h2>
            <ul className="space-y-3 mb-4 max-h-[min(50vh,320px)] overflow-y-auto overscroll-contain -mr-1 pr-1 touch-pan-y sm:max-h-none sm:overflow-visible">
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
                        <div className="inline-flex items-stretch rounded-lg border border-neutral-200/90 bg-white shadow-sm">
                          <button
                            type="button"
                            onClick={() => updateQty(i.productId, i.variantId, Math.max(0, i.qty - 1))}
                            className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 active:bg-neutral-100 rounded-l-md text-base leading-none"
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
                            className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 active:bg-neutral-100 rounded-r-md text-base leading-none"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-neutral-900 tabular-nums">
                          {variant?.compareAtPrice && (
                            <span className="line-through text-neutral-500 text-[10px] sm:text-xs mr-1">{formatPrice(variant.compareAtPrice * i.qty, currency)}</span>
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
          </section>

        <div className="rounded-2xl border border-gold-200/60 bg-gradient-to-br from-white via-gold-50/30 to-white p-3.5 sm:p-4 shadow-[0_8px_32px_-12px_rgba(203,168,71,0.25)]">
          <div className="space-y-2 text-sm text-neutral-600">
            <div className="flex justify-between gap-2">
              <span>Subtotal</span>
              <span className="tabular-nums text-neutral-900 font-medium">{formatPrice(subtotal, currency)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between gap-2 text-emerald-800">
                <span>Discount</span>
                <span className="tabular-nums font-medium">−{formatPrice(discountAmount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span>Shipping</span>
              <span className="tabular-nums text-neutral-900 font-medium">
                {shipping === 0 ? 'Free' : formatPrice(shipping, currency)}
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 border-t border-neutral-200/90 pt-4">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100 ring-1 ring-gold-200/40">
              <Image
                src={firstThumb || '/assets/nature-secret-logo.svg'}
                alt=""
                fill
                className="object-cover"
                sizes="56px"
                unoptimized={firstThumb && !String(firstThumb).startsWith('http')}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-neutral-900">Total due on delivery</p>
              <p className="text-xs text-neutral-500">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </p>
            </div>
            <p className="text-base lg:text-lg font-bold tabular-nums text-neutral-900 shrink-0">
              {formatPrice(grandTotal, currency)}
            </p>
          </div>
        </div>

          <div ref={orderErrorRef}>
            {orderError && (
              <p className="rounded-xl border border-red-200 bg-red-50/90 px-3 py-2.5 text-sm font-medium text-red-800">
                {orderError}
              </p>
            )}
          </div>

          <div className="hidden lg:block space-y-2">
            <button
              type="submit"
              disabled={placing}
              aria-busy={placing}
              className={`${ctaBase} w-full min-h-[3rem]`}
            >
              {placing ? 'Placing order…' : 'Complete order'}
            </button>
            {placing && <p className="text-center text-xs font-medium text-gold-800/90">Usually takes a few seconds.</p>}
          </div>
        </aside>
        </div>
      </form>

      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-gold-200/50 bg-gradient-to-t from-gold-50/90 via-white to-white/98 backdrop-blur-md px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_-10px_rgba(203,168,71,0.25)] lg:hidden"
        role="region"
        aria-label="Order total and submit"
      >
        <p className="text-[10px] text-center font-semibold text-gold-800/90 mb-2 leading-snug">
          Pay on delivery · COD · Secure delivery
        </p>
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gold-800/80">Total</p>
            <p className="text-lg font-bold tabular-nums text-neutral-900 truncate leading-tight">
              {formatPrice(grandTotal, currency)}
            </p>
            <p className="text-[10px] text-neutral-600">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} · COD
            </p>
          </div>
          <button
            type="submit"
            form="checkout-form"
            disabled={placing}
            aria-busy={placing}
            className={`${ctaBase} min-h-[44px] min-w-[9.5rem] shrink-0 px-4 py-2.5 text-sm`}
          >
            {placing ? 'Placing…' : 'Complete order'}
          </button>
        </div>
        {placing && (
          <p className="text-[10px] text-center font-medium text-gold-800/80 mt-2">Usually takes a few seconds.</p>
        )}
      </div>
    </div>
  );
}
