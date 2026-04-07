'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  captureAttributionFromUrl,
  getAttributionForTracking,
  stripEmptyAttributionFields,
} from '@/lib/attribution';
import { trackAnalytics } from '@/lib/api';

function pushAnalyticsEventToServer(row) {
  if (typeof window === 'undefined') return;
  try {
    const {
      type,
      sessionId,
      path,
      contentId,
      productId,
      orderId,
      campaignId,
      adsetId,
      adId,
      customerEmail,
      customerName,
      ...rest
    } = row;
    const payload = {};
    Object.keys(rest).forEach((k) => {
      const v = rest[k];
      if (v !== undefined && v !== null) payload[k] = v;
    });
    void trackAnalytics({
      type,
      sessionId,
      path: path || undefined,
      contentId: contentId || productId || undefined,
      productId: productId || undefined,
      orderId: orderId || undefined,
      campaignId: campaignId || undefined,
      adsetId: adsetId || undefined,
      adId: adId || undefined,
      customerEmail: customerEmail || undefined,
      customerName: customerName || undefined,
      payload: Object.keys(payload).length ? payload : undefined,
    });
  } catch (_) {}
}

export const useCartOpenStore = create((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));

export const useAuthModalStore = create((set) => ({
  open: false,
  mode: 'login', // 'login' | 'signup' | 'forgot'
  openLogin: () => set({ open: true, mode: 'login' }),
  openSignup: () => set({ open: true, mode: 'signup' }),
  openForgot: () => set({ open: true, mode: 'forgot' }),
  close: () => set({ open: false }),
}));

const CUSTOMER_KEY = 'nature-secret-customer';
const CUSTOMER_TOKEN_KEY = 'nature_secret_customer_token';
const CUSTOMER_PROFILE_KEY = 'nature_secret_customer';

export const useCustomerStore = create(
  persist(
    (set) => ({
      customer: null,
      login: (customer) => set({ customer }),
      logout: () => {
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(CUSTOMER_TOKEN_KEY);
            localStorage.removeItem(CUSTOMER_PROFILE_KEY);
          } catch (_) {}
        }
        set({ customer: null });
      },
    }),
    { name: CUSTOMER_KEY }
  )
);

const CART_KEY = 'nature-secret-cart';
const WISHLIST_KEY = 'nature-secret-wishlist';
const ORDERS_KEY = 'nature-secret-orders';
const DISCOUNT_KEY = 'nature-secret-discounts';

function loadJson(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

export const useCartStore = create(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId && i.variantId === item.variantId
          );
          const next = existing
            ? state.items.map((i) =>
                i === existing ? { ...i, qty: i.qty + (item.qty || 1) } : i
              )
            : [...state.items, { ...item, qty: item.qty || 1 }];
          return { items: next };
        }),
      /** Same product+variant as existing line: no-op, returns false. Otherwise appends line, returns true. */
      addItemIfNew: (item) => {
        let added = false;
        set((state) => {
          const vid = item.variantId ?? '';
          const existing = state.items.find(
            (i) =>
              i.productId === item.productId && String(i.variantId ?? '') === String(vid)
          );
          if (existing) return state;
          added = true;
          return { items: [...state.items, { ...item, qty: item.qty || 1 }] };
        });
        return added;
      },
      updateQty: (productId, variantId, qty) =>
        set((state) => ({
          items:
            qty < 1
              ? state.items.filter((i) => !(i.productId === productId && i.variantId === variantId))
              : state.items.map((i) =>
                  i.productId === productId && i.variantId === variantId ? { ...i, qty } : i
                ),
        })),
      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId)
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: CART_KEY }
  )
);

export const useWishlistStore = create(
  persist(
    (set) => ({
      productIds: [],
      toggle: (id) =>
        set((state) => ({
          productIds: state.productIds.includes(id)
            ? state.productIds.filter((p) => p !== id)
            : [...state.productIds, id],
        })),
    }),
    { name: WISHLIST_KEY }
  )
);

export const useOrdersStore = create(
  persist(
    (set) => ({
      orders: [],
      addOrder: (order) => {
        const id = order.id || `ORD-${Date.now()}`;
        const createdAt = new Date().toISOString();
        const status = order.status || 'pending';
        const withMeta = {
          ...order,
          id,
          createdAt,
          status,
          statusTimeline: [{ status, changedAt: createdAt, changedBy: 'system' }],
        };
        set((state) => ({ orders: [withMeta, ...state.orders] }));
        return id;
      },
      updateOrderStatus: (orderId, status, changedBy = 'admin') =>
        set((state) => {
          const now = new Date().toISOString();
          return {
            orders: state.orders.map((o) => {
              if (o.id !== orderId) return o;
              const timeline = Array.isArray(o.statusTimeline) && o.statusTimeline.length > 0
                ? o.statusTimeline
                : [{ status: o.status || 'pending', changedAt: o.createdAt || now, changedBy: 'system' }];
              const newEntry = { status, changedAt: now, changedBy: changedBy === 'staff' ? 'staff' : 'admin' };
              return {
                ...o,
                status,
                statusTimeline: [...timeline, newEntry],
                ...(status === 'shipped' && !o.dispatchedAt ? { dispatchedAt: now } : {}),
              };
            }),
          };
        }),
      updateOrder: (orderId, updates) =>
        set((state) => ({
          orders: state.orders.map((o) => (o.id === orderId ? { ...o, ...updates } : o)),
        })),
    }),
    { name: ORDERS_KEY }
  )
);

export function getDiscountCodes() {
  return loadJson(DISCOUNT_KEY, { WELCOME10: 10, NATURE15: 15 });
}

export function setDiscountCodes(codes) {
  saveJson(DISCOUNT_KEY, codes);
}

const PRODUCTS_KEY = 'nature-secret-products';
const BLOG_KEY = 'nature-secret-blog';

export const useProductsStore = create(
  persist(
    (set) => ({
      products: [],
      setProducts: (products) => set({ products: Array.isArray(products) ? products : [] }),
      addProduct: (product) =>
        set((state) => ({
          products: [...state.products, { ...product, id: String(Date.now()) }],
        })),
      updateProduct: (id, updates) =>
        set((state) => ({
          products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),
      deleteProduct: (id) =>
        set((state) => ({ products: state.products.filter((p) => p.id !== id) })),
    }),
    { name: PRODUCTS_KEY }
  )
);

export const useBlogStore = create(
  persist(
    (set) => ({
      posts: [],
      setPosts: (posts) => set({ posts: Array.isArray(posts) ? posts : [] }),
      addPost: (post) =>
        set((state) => ({
          posts: [...state.posts, { ...post, id: String(Date.now()) }],
        })),
      updatePost: (id, updates) =>
        set((state) => ({
          posts: state.posts.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),
      deletePost: (id) => set((state) => ({ posts: state.posts.filter((p) => p.id !== id) })),
    }),
    { name: BLOG_KEY }
  )
);

const ANALYTICS_KEY = 'nature-secret-analytics';
function getSessionId() {
  if (typeof window === 'undefined') return '';
  let s = sessionStorage.getItem('nature_secret_session');
  if (!s) {
    s = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('nature_secret_session', s);
  }
  return s;
}

export const useAnalyticsStore = create(
  persist(
    (set) => ({
      events: [],
      track: (type, data = {}) =>
        set((state) => {
          const sessionId = getSessionId();
          let customerInfo = {};
          if (typeof window !== 'undefined') {
            try {
              const customer = useCustomerStore.getState().customer;
              if (customer) {
                customerInfo = { customerEmail: customer.email, customerName: customer.name };
              }
            } catch (_) {}
            captureAttributionFromUrl();
          }
          const attr = typeof window !== 'undefined' ? getAttributionForTracking() : {};
          const attrMerged = {};
          if (attr.campaignId) attrMerged.campaignId = attr.campaignId;
          if (attr.adsetId) attrMerged.adsetId = attr.adsetId;
          if (attr.adId) attrMerged.adId = attr.adId;
          const ts = new Date().toISOString();
          const row = stripEmptyAttributionFields({
            type,
            ...data,
            ...attrMerged,
            ...customerInfo,
            timestamp: ts,
            sessionId,
          });
          pushAnalyticsEventToServer(row);
          return {
            events: [...state.events, row].slice(-5000),
          };
        }),
      clear: () => set({ events: [] }),
    }),
    { name: ANALYTICS_KEY }
  )
);

const CURRENCY_KEY = 'nature-secret-currency';
// Persist currency as PKR; when reading from localStorage, force PKR so old INR is overwritten
const currencyStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(name);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.state?.currency && parsed.state.currency !== 'PKR') {
        parsed.state = { ...parsed.state, currency: 'PKR' };
        return JSON.stringify(parsed);
      }
      return raw;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
  },
};
export const useCurrencyStore = create(
  persist(
    (set) => ({
      currency: 'PKR',
      setCurrency: () => {},
      initFromLocale: () => set({ currency: 'PKR' }),
    }),
    { name: CURRENCY_KEY, storage: currencyStorage }
  )
);

const CUSTOMER_NOTES_KEY = 'nature-secret-customer-notes';
export const useCustomerNotesStore = create(
  persist(
    (set) => ({
      notes: {},
      setNote: (email, note) => set((state) => ({ notes: { ...state.notes, [email]: note } })),
    }),
    { name: CUSTOMER_NOTES_KEY }
  )
);
