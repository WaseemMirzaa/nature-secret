'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/Link';
import Image from 'next/image';
import { useCartStore, useOrdersStore, useProductsStore, useCurrencyStore, useCustomerStore } from '@/lib/store';
import { getDiscountCodes } from '@/lib/store';
import { trackCheckoutPageView, trackInitiateCheckout, trackPlaceOrderClick, trackPurchase } from '@/lib/analytics';
import { formatPrice } from '@/lib/currency';
import { createOrder as apiCreateOrder, trackAnalytics } from '@/lib/api';
import { useProductsAndCategories } from '@/lib/useApiData';
import { CustomerPageLoader } from '@/components/ui/PageLoader';

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
    state: '',
    pincode: '',
  });
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => setMounted(true), []);
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

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const codes = getDiscountCodes();
  const discountPct = appliedDiscount ? (codes[appliedDiscount] ?? 0) : 0;
  const discountAmount = Math.round((subtotal * discountPct) / 100);
  const total = subtotal - discountAmount;
  const shipping = total >= 99900 ? 0 : 9900;
  const grandTotal = total + shipping;
  const metaCustomer = {
    email: form.email,
    name: form.name,
    phone: form.phone,
    city: form.city,
    state: form.state,
    pincode: form.pincode,
    country: 'PK',
  };

  const lastInitiateCheckoutKeyRef = useRef(null);
  const lastCheckoutViewKeyRef = useRef(null);
  useEffect(() => {
    if (!mounted || items.length === 0) return;
    const contentIds = items.map((i) => i.productId);
    const phoneDigits = String(form.phone || '').replace(/\D/g, '');
    const key = `${currency}|${grandTotal}|${contentIds.join(',')}|${form.email || ''}|${phoneDigits}|${form.name || ''}|${form.city || ''}|${form.state || ''}|${form.pincode || ''}`;
    if (lastInitiateCheckoutKeyRef.current === key) return;
    lastInitiateCheckoutKeyRef.current = key;
    trackInitiateCheckout(grandTotal / 100, currency, contentIds, metaCustomer);
  }, [mounted, items, grandTotal, currency, form.email, form.phone, form.name, form.city, form.state, form.pincode]);

  useEffect(() => {
    if (!mounted || items.length === 0) return;
    const contentIds = items.map((i) => i.productId);
    const phoneDigits = String(form.phone || '').replace(/\D/g, '');
    const key = `${currency}|${grandTotal}|${contentIds.join(',')}|${form.email || ''}|${phoneDigits}`;
    if (lastCheckoutViewKeyRef.current === key) return;
    lastCheckoutViewKeyRef.current = key;
    trackCheckoutPageView(grandTotal / 100, currency, contentIds, metaCustomer);
  }, [mounted, items, grandTotal, currency, form.email, form.name, form.phone, form.city, form.state, form.pincode]);

  function applyDiscount() {
    const code = discountCode.trim().toUpperCase();
    if (codes[code] != null) setAppliedDiscount(code);
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
    const addressStr = `${form.address}, ${form.city}, ${form.state} ${form.pincode}`;
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
      trackPlaceOrderClick(grandTotal / 100, currency, items.map((i) => i.productId), metaCustomer);
      const res = await apiCreateOrder(orderPayload);
      orderId = res?.id;
      if (!orderId) throw new Error('Order creation failed');
      addOrder({ id: orderId, ...orderPayload, status: 'pending' });
    } catch (err) {
      setPlacing(false);
      setOrderError(err?.body?.message || err?.message || 'Failed to place order. Please try again.');
      return;
    }
    trackPurchase(orderId, grandTotal / 100, currency, items.map((i) => i.productId), metaCustomer);
    try {
      localStorage.setItem(
        'nature_secret_last_order_meta_customer',
        JSON.stringify({ ...metaCustomer, externalId: orderId }),
      );
    } catch (_) {}
    try { await trackAnalytics({ type: 'purchase', orderId, sessionId: `sess-${Date.now()}`, payload: {} }); } catch (_) {}
    clear();
    setPlacing(false);
    router.push(`/checkout/confirmation?order=${orderId}`);
  }

  if (!mounted) return <CustomerPageLoader message="Loading" />;

  if (items.length === 0 && !placing) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 sm:py-16 text-center">
        <p className="text-neutral-600">Your cart is empty.</p>
        <Link href="/shop" className="mt-4 inline-block font-medium text-neutral-900">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-12 animate-slide-up">
      <div className="mb-4 sm:mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Checkout</h1>
        <p className="mt-1 text-sm text-neutral-500">Complete your order. We&apos;ll confirm via email.</p>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
        <div>
          <h2 className="text-sm font-medium text-neutral-900 mb-4">Contact & delivery</h2>
          <div className="space-y-4">
            <input
              type="email"
              required
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-neutral-900"
            />
            <input
              type="text"
              required
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-neutral-900"
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
              className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-neutral-900"
            />
            {phoneError && <p className="text-sm text-red-600 -mt-2">{phoneError}</p>}
            <textarea
              required
              placeholder="Address"
              rows={2}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-neutral-900"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input
                type="text"
                required
                placeholder="City"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className="rounded-xl border border-neutral-200 px-4 py-3 text-neutral-900"
              />
              <input
                type="text"
                required
                placeholder="State"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                className="rounded-xl border border-neutral-200 px-4 py-3 text-neutral-900"
              />
              <input
                type="text"
                required
                placeholder="Pincode"
                value={form.pincode}
                onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
                className="rounded-xl border border-neutral-200 px-4 py-3 text-neutral-900"
              />
            </div>
          </div>
          <p className="mt-4 text-sm text-neutral-500">Payment: Cash on delivery.</p>
        </div>

        <div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 sm:p-6 sticky top-20 sm:top-24">
            <h2 className="text-sm font-medium text-neutral-900 mb-4">Order summary</h2>
            <ul className="space-y-4 mb-4">
              {items.map((i) => {
                const p = getProduct(i.productId);
                const variant = getVariant(i.productId, i.variantId);
                const imgSrc = variant?.image || p?.images?.[0] || '/assets/nature-secret-logo.svg';
                const lineTotal = i.price * i.qty;
                return (
                  <li key={`${i.productId}-${i.variantId ?? 'default'}`} className="flex gap-3">
                    <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-white flex-shrink-0">
                      <Image src={imgSrc} alt="" fill className="object-cover" sizes="56px" unoptimized={!imgSrc.startsWith('http')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{p?.name ?? i.name ?? 'Product'}{variant ? ` (${variant.name})` : ''}</p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
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
                        <p className="text-sm font-medium text-neutral-900">
                          {variant?.compareAtPrice && (
                            <span className="line-through text-neutral-400 text-xs mr-1.5">{formatPrice(variant.compareAtPrice * i.qty, currency)}</span>
                          )}
                          {formatPrice(lineTotal, currency)}
                        </p>
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">Each {formatPrice(i.price, currency)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Discount code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              />
              <button type="button" onClick={applyDiscount} className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-medium">Apply</button>
            </div>
            {appliedDiscount && <p className="text-xs text-green-600 mb-2">Code applied</p>}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-neutral-600"><span>Subtotal</span><span>{formatPrice(subtotal, currency)}</span></div>
              {discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>−{formatPrice(discountAmount, currency)}</span></div>}
              <div className="flex justify-between text-neutral-600"><span>Shipping</span><span>{shipping === 0 ? 'Free' : formatPrice(shipping, currency)}</span></div>
              <div className="flex justify-between font-semibold text-neutral-900 pt-2 border-t border-neutral-200"><span>Total</span><span>{formatPrice(grandTotal, currency)}</span></div>
            </div>
            {orderError && <p className="mt-4 text-sm text-red-600">{orderError}</p>}
            <button
              type="submit"
              disabled={placing}
              className="mt-6 w-full rounded-2xl bg-neutral-900 py-3.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 animate-cta-attract hover:animate-none transition disabled:animate-none"
            >
              {placing ? 'Placing order…' : 'Place order (Cash on delivery)'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
