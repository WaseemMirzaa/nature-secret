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
        await trackPurchase(
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
      await trackPurchase(
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
    'w-full rounded-2xl border border-neutral-600 bg-gradient-to-b from-white to-gold-50/[0.35] px-2.5 py-2 text-base leading-snug text-neutral-900 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] placeholder:text-neutral-400/85 placeholder:text-sm max-sm:placeholder:font-normal transition-all duration-200 hover:border-neutral-700 hover:shadow-[0_1px_6px_-3px_rgba(0,0,0,0.06)] focus:border-neutral-700 focus:bg-white focus:shadow-[0_0_0_3px_rgba(82,82,82,0.16)] focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:border-2 sm:border-neutral-600 sm:px-3 sm:py-2.5 sm:text-sm sm:leading-snug lg:px-3.5 lg:py-3 lg:text-[0.9375rem]';

  const labelClass =
    'block mb-0.5 sm:mb-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.12em] sm:tracking-wide text-neutral-600';

  /** Card lift: black-tinted shadow (~½ previous spread/opacity) */
  const checkoutCardShadow =
    'shadow-[0_2px_16px_-4px_rgba(0,0,0,0.11),inset_0_1px_0_0_rgba(255,255,255,0.88)] sm:shadow-[0_4px_22px_-6px_rgba(0,0,0,0.13)]';
  const cardSurface =
    `rounded-[1.75rem] border-0 bg-gradient-to-br from-white via-white to-gold-50/25 ${checkoutCardShadow} sm:rounded-2xl`;

  const sectionTitle =
    'text-[10px] sm:text-xs font-bold text-neutral-900 border-l-[3px] border-gold-500 pl-2 sm:pl-2.5 tracking-tight';

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
    'checkout-cta-animated inline-flex items-center justify-center rounded-full sm:rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_3px_12px_-6px_rgba(0,0,0,0.22),0_0_0_1px_rgba(212,175,55,0.1)] ring-1 ring-inset ring-white/10 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_5px_18px_-8px_rgba(0,0,0,0.28)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 disabled:hover:scale-100 motion-reduce:transition-none motion-reduce:hover:scale-100 sm:px-6 sm:py-3.5 sm:text-[0.9375rem]';

  return (
    <div className="checkout-page mx-auto max-w-6xl px-3 sm:px-5 lg:px-8 py-4 sm:py-6 lg:py-12 max-lg:pb-36 lg:pb-16">
      <div className="mb-5 sm:mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4 animate-checkout-enter motion-reduce:animate-none motion-reduce:opacity-100">
        <div className="min-w-0">
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-gold-700/90 mb-0.5 sm:mb-1">
            Almost there
          </p>
          <h1 className="text-base sm:text-lg lg:text-xl font-bold text-neutral-900 tracking-tight">
            Complete your order
          </h1>
          <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs lg:text-sm text-neutral-600 leading-relaxed max-w-md">
            Pay cash on delivery when it arrives — delivery in 5–7 business days.
          </p>
        </div>
        {!customer && (
          <Link
            href="/login"
            className="text-xs sm:text-sm font-semibold text-gold-800 hover:text-gold-700 border-b border-gold-400/50 sm:border-b-2 sm:border-gold-400/60 pb-0.5 shrink-0 self-start transition-colors"
          >
            Sign in
          </Link>
        )}
      </div>
      <form ref={formRef} id="checkout-form" onSubmit={handleSubmit}>
        <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_min(20rem,32%)] lg:gap-x-8 xl:grid-cols-[minmax(0,1fr)_min(22rem,380px)] xl:gap-x-12 lg:items-start">
          <div className="space-y-4 sm:space-y-6 lg:space-y-7 min-w-0">
        <section
          id="checkout-contact"
          className={`scroll-mt-24 animate-checkout-enter checkout-enter-delay-1 motion-reduce:animate-none motion-reduce:opacity-100 p-3.5 sm:p-4 ${cardSurface}`}
        >
          <h2 className={`${sectionTitle} mb-2.5 sm:mb-3`}>Contact & delivery</h2>
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
                <p id="checkout-phone-hint" className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] font-medium text-gold-800/75">
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
            {phoneError && (
              <p className="text-[11px] sm:text-sm text-red-600 font-medium">{phoneError}</p>
            )}
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
                className={`${fieldClass} min-h-[3.75rem] sm:min-h-[4.25rem] lg:min-h-[5.5rem] resize-y`}
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

        <section className={`animate-checkout-enter checkout-enter-delay-2 motion-reduce:animate-none motion-reduce:opacity-100 p-3.5 sm:p-4 ${cardSurface}`}>
          <h2 className={`${sectionTitle} mb-2 sm:mb-2.5`}>Shipping method</h2>
          <div className="flex items-center justify-between gap-3 rounded-2xl border-0 bg-gradient-to-br from-neutral-50/90 to-white px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs sm:text-sm shadow-[0_2px_10px_-4px_rgba(0,0,0,0.08)]">
            <span className="font-medium text-neutral-800">Standard</span>
            <span className="font-semibold tabular-nums text-neutral-900">
              {shipping === 0 ? 'Free' : formatPrice(shipping, currency)}
            </span>
          </div>
          <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-neutral-500 leading-relaxed">
            {shipping === 0 ? 'Free shipping on this order.' : 'Standard delivery 5–7 business days.'}
          </p>
        </section>

        <section className={`animate-checkout-enter checkout-enter-delay-3 motion-reduce:animate-none motion-reduce:opacity-100 p-3.5 sm:p-4 ${cardSurface}`}>
          <h2 className={`${sectionTitle} mb-1`}>Payment</h2>
          <p className="text-[10px] sm:text-xs text-neutral-500 mb-2 sm:mb-3 leading-relaxed">
            All transactions are secure. Pay when your order arrives.
          </p>
          <div className="rounded-2xl border-0 bg-gold-100 px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-semibold text-neutral-900 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.07)]">
            Cash on delivery (COD)
          </div>
        </section>

        <section className={`animate-checkout-enter checkout-enter-delay-4 motion-reduce:animate-none motion-reduce:opacity-100 p-3.5 sm:p-4 ${cardSurface}`}>
          <h2 className={`${sectionTitle} mb-2 sm:mb-2.5`}>Discount</h2>
          <div className="flex gap-1.5 sm:gap-2 items-stretch">
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
              className="shrink-0 self-stretch rounded-full sm:rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-800 px-3.5 sm:px-4 py-2 text-[12px] sm:text-sm font-semibold text-white shadow-[0_2px_8px_-4px_rgba(0,0,0,0.18)] ring-1 ring-gold-500/15 transition hover:scale-[1.02] active:scale-[0.98] motion-reduce:hover:scale-100 touch-manipulation min-w-[4.25rem] sm:min-w-0"
            >
              Apply
            </button>
          </div>
          {discountError && (
            <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs font-medium text-red-600">{discountError}</p>
          )}
          {appliedDiscount && !discountError && (
            <div className="mt-2.5 sm:mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-emerald-50/90 border border-emerald-200/60 px-2.5 py-1.5 sm:px-3 sm:py-2">
              <p className="text-[11px] sm:text-xs font-medium text-emerald-800 leading-snug">
                {isNsPromoCode(appliedDiscount)
                  ? `${NS_PROMO_CODE} applied — Rs 150 off`
                  : `Code applied (${codes[appliedDiscount]}% off)`}
              </p>
              <button
                type="button"
                onClick={removeDiscount}
                className="text-[11px] sm:text-xs font-semibold text-emerald-900/80 underline underline-offset-2 hover:text-emerald-950 shrink-0"
              >
                Remove
              </button>
            </div>
          )}
        </section>
          </div>

        <aside className="mt-6 sm:mt-7 space-y-3 sm:space-y-4 lg:mt-0 lg:sticky lg:top-24 lg:self-start animate-checkout-enter checkout-enter-delay-5 motion-reduce:animate-none motion-reduce:opacity-100 min-w-0">
          <section className={`p-3 sm:p-4 ${cardSurface}`}>
          <h2 className={`${sectionTitle} mb-2 sm:mb-2.5`}>Order summary</h2>
            <ul className="space-y-3 mb-4 max-h-[min(50vh,320px)] overflow-y-auto overscroll-contain -mr-1 pr-1 touch-pan-y sm:max-h-none sm:overflow-visible">
              {items.map((i) => {
                const p = getProduct(i.productId);
                const variant = getVariant(i.productId, i.variantId);
                const imgSrc = variant?.image || p?.images?.[0] || '/assets/nature-secret-logo.svg';
                const lineTotal = i.price * i.qty;
                return (
                  <li key={`${i.productId}-${i.variantId ?? 'default'}`} className="flex gap-2 sm:gap-2.5 lg:gap-3">
                    <div className="relative h-11 w-11 sm:h-[3.25rem] sm:w-[3.25rem] lg:h-14 lg:w-14 rounded-2xl sm:rounded-md lg:rounded-lg overflow-hidden bg-white flex-shrink-0 ring-1 ring-gold-100/80">
                      <Image src={imgSrc} alt="" fill className="object-cover" sizes="56px" unoptimized={!imgSrc.startsWith('http')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] sm:text-sm font-medium text-neutral-900 truncate leading-snug sm:leading-tight">
                        {p?.name ?? i.name ?? 'Product'}
                        {variant ? ` (${variant.name})` : ''}
                      </p>
                      <div className="mt-1 sm:mt-1.5 lg:mt-2 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
                        <div className="inline-flex items-stretch rounded-full border border-neutral-200/90 bg-white/95 shadow-sm overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateQty(i.productId, i.variantId, Math.max(0, i.qty - 1))}
                            className="min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 active:bg-neutral-100 text-sm sm:text-base leading-none touch-manipulation"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <div className="flex min-w-[2rem] sm:min-w-[2.25rem] items-center justify-center border-x border-neutral-100 px-0.5">
                            <span className="text-xs sm:text-sm font-semibold tabular-nums leading-none text-neutral-900">{i.qty}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateQty(i.productId, i.variantId, Math.min(99, i.qty + 1))}
                            className="min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 active:bg-neutral-100 text-sm sm:text-base leading-none touch-manipulation"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-[11px] sm:text-sm font-medium text-neutral-900 tabular-nums">
                          {variant?.compareAtPrice && (
                            <span className="line-through text-neutral-500 text-[9px] sm:text-xs mr-1">{formatPrice(variant.compareAtPrice * i.qty, currency)}</span>
                          )}
                          {formatPrice(lineTotal, currency)}
                        </p>
                      </div>
                      <p className="text-[9px] sm:text-[10px] lg:text-xs text-neutral-500 mt-0.5">Each {formatPrice(i.price, currency)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

        <div className={`p-3.5 sm:p-4 ${cardSurface}`}>
          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-neutral-600">
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
          <div className="mt-3 sm:mt-4 flex items-center gap-2.5 sm:gap-3 border-t border-neutral-200/90 pt-3 sm:pt-4">
            <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-2xl sm:rounded-lg bg-neutral-100 ring-1 ring-gold-200/40">
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
              <p className="text-xs sm:text-sm font-semibold text-neutral-900">Total due on delivery</p>
              <p className="text-[10px] sm:text-xs text-neutral-500">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </p>
            </div>
            <p className="text-sm sm:text-base lg:text-lg font-bold tabular-nums text-neutral-900 shrink-0">
              {formatPrice(grandTotal, currency)}
            </p>
          </div>
        </div>

          <div ref={orderErrorRef}>
            {orderError && (
              <p className="rounded-2xl border border-red-200 bg-red-50/90 px-3 py-2 text-[11px] sm:text-sm font-medium text-red-800 leading-relaxed">
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
            {placing && (
              <p className="text-center text-[11px] sm:text-xs font-medium text-gold-800/90">Usually takes a few seconds.</p>
            )}
          </div>
        </aside>
        </div>
      </form>

      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-0 bg-gradient-to-t from-gold-50/95 via-white/98 to-white/98 backdrop-blur-xl px-3 pt-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-[0_-6px_24px_-10px_rgba(0,0,0,0.12)] lg:hidden rounded-t-[1.75rem]"
        role="region"
        aria-label="Order total and submit"
      >
        <p className="text-[9px] text-center font-medium text-gold-800/85 mb-1.5 leading-snug tracking-wide">
          Pay on delivery · COD · Secure delivery
        </p>
        <div className="flex items-end gap-2.5">
          <div className="min-w-0 flex-1 pl-0.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-gold-800/75">Total</p>
            <p className="text-base font-bold tabular-nums text-neutral-900 truncate leading-tight tracking-tight">
              {formatPrice(grandTotal, currency)}
            </p>
            <p className="text-[9px] text-neutral-500 mt-0.5">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} · COD
            </p>
          </div>
          <button
            type="submit"
            form="checkout-form"
            disabled={placing}
            aria-busy={placing}
            className={`${ctaBase} min-h-[46px] min-w-[8.75rem] shrink-0 px-4 touch-manipulation`}
          >
            {placing ? 'Placing…' : 'Complete order'}
          </button>
        </div>
        {placing && (
          <p className="text-[9px] text-center font-medium text-gold-800/75 mt-1.5">Usually takes a few seconds.</p>
        )}
      </div>
    </div>
  );
}
