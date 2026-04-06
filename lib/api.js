/**
 * API client for Nature Secret backend.
 * Set NEXT_PUBLIC_API_URL in .env to your backend origin (no trailing slash).
 * Set NEXT_PUBLIC_API_TIMEOUT_MS for request timeout (ms); see lib/apiTimeout.js.
 */
import { getApiRequestTimeoutMs } from '@/lib/apiTimeout';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');

function getBase() {
  return API_BASE_URL;
}

const OLD_DOMAINS = ['https://shifaefitrat.com', 'http://shifaefitrat.com'];

/** True if slug is safe for URL (no spaces, pipes, slashes; reasonable length). */
export function isSafeProductSlug(slug) {
  if (!slug || typeof slug !== 'string') return false;
  const s = slug.trim();
  if (s.length === 0 || s.length > 80) return false;
  return /^[a-z0-9-]+$/i.test(s);
}

/** Path segment for product page: safe slug or product id. */
export function productPath(product) {
  if (!product) return '';
  const slug = product.slug && product.slug.trim();
  return isSafeProductSlug(slug) ? slug : (product.id || '');
}

/** Resolve product/variant image path to full URL (API origin for relative paths). */
export function resolveImageUrl(path) {
  if (!path || typeof path !== 'string') return path || '';
  for (const old of OLD_DOMAINS) {
    if (path.startsWith(old)) {
      const rel = path.slice(old.length);
      const base = getBase();
      return base ? `${base}${rel.startsWith('/') ? rel : '/' + rel}` : rel;
    }
  }
  if (path.startsWith('http')) return path;
  const base = getBase();
  return base ? `${base}${path.startsWith('/') ? path : '/' + path}` : path;
}

function getApiBase() {
  return `${getBase()}/api/v1`;
}

function getAdminToken() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('nature_secret_admin');
    const data = raw ? JSON.parse(raw) : null;
    return data?.access_token || null;
  } catch {
    return null;
  }
}

export function getCustomerToken() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('nature_secret_customer_token');
    return raw || null;
  } catch {
    return null;
  }
}

export async function apiRequest(path, options = {}) {
  const base = getApiBase();
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const { signal: userSignal, ...fetchRest } = options;
  const headers = { 'Content-Type': 'application/json', ...fetchRest.headers };
  const adminToken = getAdminToken();
  const customerToken = getCustomerToken();
  const isAdminPath = path.startsWith('/admin');
  const useCustomerAuth = !isAdminPath && (path.startsWith('/orders') || path.startsWith('/customers') || path.startsWith('/support'));
  if (useCustomerAuth && customerToken) headers.Authorization = `Bearer ${customerToken}`;
  else if (adminToken) headers.Authorization = `Bearer ${adminToken}`;
  else if (customerToken) headers.Authorization = `Bearer ${customerToken}`;

  const timeoutMs = getApiRequestTimeoutMs();
  const timeoutCtrl = new AbortController();
  let timeoutId;
  const onUserAbort = () => {
    if (timeoutId != null) clearTimeout(timeoutId);
    timeoutCtrl.abort(userSignal.reason);
  };
  if (userSignal) {
    if (userSignal.aborted) {
      const r = userSignal.reason;
      throw r instanceof Error ? r : new DOMException('Aborted', 'AbortError');
    }
    userSignal.addEventListener('abort', onUserAbort, { once: true });
  }
  timeoutId = setTimeout(() => {
    timeoutId = null;
    try {
      timeoutCtrl.abort(new DOMException(`Request timed out after ${timeoutMs}ms`, 'TimeoutError'));
    } catch (_) {
      timeoutCtrl.abort();
    }
  }, timeoutMs);

  let res;
  try {
    res = await fetch(url, { ...fetchRest, headers, credentials: 'include', signal: timeoutCtrl.signal });
  } finally {
    if (timeoutId != null) clearTimeout(timeoutId);
    if (userSignal) userSignal.removeEventListener('abort', onUserAbort);
  }
  if (!res.ok) {
    if (res.status === 401 && adminToken && typeof window !== 'undefined') {
      try {
        localStorage.removeItem('nature_secret_admin');
        if (path.startsWith('/admin') || path.includes('/admin/')) window.location.replace('/admin/login');
      } catch (_) {}
    }
    const err = new Error(res.statusText || 'Request failed');
    err.status = res.status;
    try { err.body = await res.json(); } catch { err.body = await res.text(); }
    throw err;
  }
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) return res.json();
  return res.text();
}

export const api = {
  get: (path) => apiRequest(path, { method: 'GET' }),
  post: (path, body) => apiRequest(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => apiRequest(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => apiRequest(path, { method: 'DELETE' }),
};

/** Normalize API error to a single string (handles array messages from validation). */
export function formatApiError(err, fallback = 'Something went wrong.') {
  const msg = err?.body?.message ?? err?.message;
  if (Array.isArray(msg)) return msg.filter(Boolean).join(' ') || fallback;
  if (typeof msg === 'string' && msg.trim()) return msg.trim();
  return fallback;
}

/** Full error string for UI: status + message (e.g. "401 Unauthorized – Invalid token"). */
export function formatApiErrorFull(err, fallback = 'Something went wrong.') {
  const status = err?.status;
  const msg = formatApiError(err, fallback);
  if (status) return `${status} – ${msg}`;
  return msg;
}

/** Admin auth */
export async function adminLogin(email, password) {
  const data = await api.post('/auth/admin/login', { email, password });
  if (typeof window !== 'undefined' && data.access_token) {
    const payload = { ...data.user, access_token: data.access_token };
    localStorage.setItem('nature_secret_admin', JSON.stringify(payload));
  }
  return data;
}

export async function adminRegister(email, password) {
  const data = await api.post('/auth/admin/register', { email, password });
  if (typeof window !== 'undefined' && data.access_token) {
    const payload = { ...data.user, access_token: data.access_token };
    localStorage.setItem('nature_secret_admin', JSON.stringify(payload));
  }
  return data;
}

/** Customer auth */
export async function customerLogin(email, password) {
  const data = await api.post('/auth/customer/login', { email, password });
  if (typeof window !== 'undefined' && data.access_token) {
    localStorage.setItem('nature_secret_customer_token', data.access_token);
    if (data.customer) localStorage.setItem('nature_secret_customer', JSON.stringify(data.customer));
  }
  return data;
}

export async function customerRegister(email, password, name) {
  const data = await api.post('/auth/customer/register', { email, password, name });
  if (typeof window !== 'undefined' && data.access_token) {
    localStorage.setItem('nature_secret_customer_token', data.access_token);
    if (data.customer) localStorage.setItem('nature_secret_customer', JSON.stringify(data.customer));
  }
  return data;
}

/** Customer auth via Firebase ID token (after signInWithEmailAndPassword / createUserWithEmailAndPassword) */
export async function customerFirebaseLogin(idToken, name) {
  const data = await api.post('/auth/customer/firebase-login', { idToken, name });
  if (typeof window !== 'undefined' && data.access_token) {
    localStorage.setItem('nature_secret_customer_token', data.access_token);
    if (data.customer) localStorage.setItem('nature_secret_customer', JSON.stringify(data.customer));
  }
  return data;
}

export async function customerForgotPassword(email, resetBaseUrl) {
  return api.post('/auth/customer/forgot-password', { email, resetBaseUrl });
}

export async function customerResetPassword(token, newPassword) {
  return api.post('/auth/customer/reset-password', { token, newPassword });
}

/** Public */
export async function getProducts(params = {}) {
  const q = new URLSearchParams();
  if (params.categoryId) q.set('categoryId', params.categoryId);
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  const query = q.toString();
  return api.get(`/products${query ? `?${query}` : ''}`);
}

export async function getProductBySlug(slug) {
  return api.get(`/products/slug/${encodeURIComponent(slug)}`);
}

export async function getProductById(id) {
  return api.get(`/products/${encodeURIComponent(id)}`);
}

export async function getCategories() {
  return api.get('/categories');
}

/** Public: contact / WhatsApp settings for customer-facing pages */
export async function getContactSettings() {
  return api.get('/settings/contact');
}

export async function getContentSettings() {
  return api.get('/settings/content');
}

/** Customer: list my orders (requires customer auth). */
export async function getCustomerOrders(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return api.get(`/orders${s ? `?${s}` : ''}`);
}

/** Customer: get one order by id (requires customer auth). */
export async function getCustomerOrder(id) {
  return api.get(`/orders/${encodeURIComponent(id)}`);
}

export async function createOrder(orderPayload) {
  return api.post('/orders', orderPayload);
}

function isRetryableTrackError(err) {
  if (!err) return false;
  const status = err.status;
  if (typeof status === 'number') {
    if (status === 429) return true;
    if (status >= 500) return true;
  }
  const m = String(err.message || err).toLowerCase();
  return (
    m.includes('failed to fetch') ||
    m.includes('fetch failed') ||
    m.includes('network') ||
    m.includes('timeout') ||
    m.includes('aborted') ||
    m.includes('load failed')
  );
}

/** Visitor analytics — retries on slow/offline so “hits” are not silently dropped. */
export async function trackAnalytics(event) {
  const max = 4;
  for (let attempt = 0; attempt < max; attempt++) {
    try {
      await api.post('/analytics/track', event);
      return;
    } catch (e) {
      if (!isRetryableTrackError(e) || attempt === max - 1) return;
      await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
    }
  }
}

/** Admin: visitor analytics events from DB (requires admin JWT). */
export async function getAdminAnalyticsEvents(params = {}) {
  const q = new URLSearchParams();
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  if (params.sessionId) q.set('sessionId', params.sessionId);
  if (params.email) q.set('email', params.email);
  if (params.limit != null) q.set('limit', String(params.limit));
  const s = q.toString();
  return api.get(`/admin/analytics/events${s ? `?${s}` : ''}`);
}

/** Admin: delete all analytics events for a session. */
export async function deleteAdminAnalyticsSession(sessionId) {
  return api.delete(`/admin/analytics/sessions/${encodeURIComponent(sessionId)}`);
}

/** Admin: Meta URL attribution rollups (campaign / ad set / ad). */
export async function getAdminMetaCampaignAnalytics(params = {}) {
  const q = new URLSearchParams();
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  if (params.campaignId) q.set('campaignId', String(params.campaignId).trim());
  if (params.adsetId) q.set('adsetId', String(params.adsetId).trim());
  if (params.adId) q.set('adId', String(params.adId).trim());
  const s = q.toString();
  return api.get(`/admin/analytics/meta-campaigns${s ? `?${s}` : ''}`);
}

/** Admin: null Meta attribution columns on matching analytics_events (rows kept). */
export async function postAdminMetaClearAttribution(body) {
  return api.post('/admin/analytics/meta-campaigns/clear-attribution', body);
}

/** Admin: Meta-attributed purchases for CSV export (email/phone from orders when linked). */
export async function getAdminMetaPurchaseExport(params = {}) {
  const q = new URLSearchParams();
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  if (params.campaignId) q.set('campaignId', String(params.campaignId).trim());
  if (params.adsetId) q.set('adsetId', String(params.adsetId).trim());
  if (params.adId) q.set('adId', String(params.adId).trim());
  const s = q.toString();
  return api.get(`/admin/analytics/meta-export/purchases${s ? `?${s}` : ''}`);
}

/** Meta Conversions API relay (server hashes PII). Fire-and-forget. */
export async function sendMetaCapi(payload) {
  const logFail = (e) => {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn('[Meta CAPI relay]', e?.status, e?.body ?? e?.message);
    }
  };
  const postOnce = () => api.post('/analytics/meta-capi', payload);
  try {
    await postOnce();
  } catch (e) {
    logFail(e);
    const status = e?.status;
    const retryable =
      status === 429 ||
      (typeof status === 'number' && status >= 500) ||
      isRetryableTrackError(e);
    if (!retryable) return;
    await new Promise((r) => setTimeout(r, 400));
    try {
      await postOnce();
    } catch (e2) {
      logFail(e2);
      if (!isRetryableTrackError(e2)) return;
      await new Promise((r) => setTimeout(r, 900));
      try {
        await postOnce();
      } catch (e3) {
        logFail(e3);
      }
    }
  }
}

/** Public blog */
export async function getBlogPosts(params = {}) {
  const q = new URLSearchParams(params);
  return api.get(`/blog/posts${q.toString() ? `?${q.toString()}` : ''}`);
}

export async function getBlogPostBySlug(slug) {
  return api.get(`/blog/posts/slug/${encodeURIComponent(slug)}`);
}

/** Public home slider */
export async function getSlider() {
  return api.get('/slider');
}

/** Admin slider */
export async function getAdminSlides() {
  return api.get('/slider/admin');
}

function uploadWithProgress(url, formData, headers, { onProgress, timeoutMs = getApiRequestTimeoutMs() } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timeoutId = timeoutMs ? setTimeout(() => { xhr.abort(); reject(new Error('Upload timed out.')); }, timeoutMs) : null;
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && typeof onProgress === 'function') onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener('load', () => {
      clearTimeout(timeoutId);
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText || '{}')); } catch { reject(new Error('Invalid response')); }
      } else {
        const err = new Error(xhr.statusText || 'Upload failed');
        err.status = xhr.status;
        try { err.body = JSON.parse(xhr.responseText); } catch { err.body = xhr.responseText; }
        reject(err);
      }
    });
    xhr.addEventListener('error', () => { clearTimeout(timeoutId); reject(new Error('Network error')); });
    xhr.addEventListener('abort', () => { clearTimeout(timeoutId); reject(new Error('Upload timed out.')); });
    xhr.open('POST', url);
    Object.entries(headers || {}).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.withCredentials = true;
    xhr.send(formData);
  });
}

export async function uploadSlideImage(file, opts = {}) {
  const base = typeof getBase === 'function' ? getBase() : (typeof window !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') : 'http://localhost:4000');
  const url = `${base}/api/v1/slider/upload`;
  const formData = new FormData();
  formData.append('image', file);
  if (opts.slug) formData.append('slug', opts.slug);
  if (opts.alt) formData.append('alt', opts.alt);
  const adminToken = getAdminToken();
  const headers = adminToken ? { Authorization: `Bearer ${adminToken}` } : {};
  return uploadWithProgress(url, formData, headers, { onProgress: opts.onProgress, timeoutMs: getApiRequestTimeoutMs() });
}

export async function createSlide(data) {
  return api.post('/slider', data);
}

export async function updateSlide(id, data) {
  return api.patch(`/slider/${encodeURIComponent(id)}`, data);
}

export async function deleteSlide(id) {
  return api.delete(`/slider/${encodeURIComponent(id)}`);
}

/** Admin (requires token) */
export async function uploadProductImage(file, opts = {}) {
  const base = typeof getBase === 'function' ? getBase() : (typeof window !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') : 'http://localhost:4000');
  const url = `${base}/api/v1/admin/products/upload`;
  const formData = new FormData();
  formData.append('image', file);
  if (opts.slug) formData.append('slug', opts.slug);
  if (opts.alt) formData.append('alt', opts.alt);
  const adminToken = getAdminToken();
  if (typeof opts.onProgress === 'function') {
    return uploadWithProgress(url, formData, adminToken ? { Authorization: `Bearer ${adminToken}` } : {}, { onProgress: opts.onProgress });
  }
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
    credentials: 'include',
    signal: AbortSignal.timeout(getApiRequestTimeoutMs()),
  });
  if (!res.ok) {
    const err = new Error(res.statusText || 'Upload failed');
    err.status = res.status;
    try { err.body = await res.json(); } catch { err.body = await res.text(); }
    throw err;
  }
  return res.json();
}

export async function getAdminOrders(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return api.get(`/admin/orders${s ? `?${s}` : ''}`);
}

export async function getAdminOrder(id) {
  return api.get(`/admin/orders/${encodeURIComponent(id)}`);
}

export async function updateOrderStatus(orderId, status) {
  return api.patch(`/admin/orders/${encodeURIComponent(orderId)}/status`, { status });
}

/** Admin only: Meta CAPI NS_EV_ORDER_VOID for fake / invalid purchase signal (once per order). */
export async function postAdminOrderMetaNotifyFakePurchase(orderId) {
  return api.post(`/admin/orders/${encodeURIComponent(orderId)}/meta-notify-fake-purchase`, {});
}

export async function getAdminProducts(params = {}) {
  const q = new URLSearchParams(params);
  return api.get(`/admin/products?${q.toString()}`);
}

export async function createProduct(data) {
  return api.post('/admin/products', data);
}

export async function updateProduct(id, data) {
  return api.patch(`/admin/products/${encodeURIComponent(id)}`, data);
}

export async function deleteProduct(id) {
  return api.delete(`/admin/products/${encodeURIComponent(id)}`);
}

/** Public: reviews for a product */
export async function getReviews(productId) {
  if (!productId) return [];
  const res = await api.get(`/reviews?productId=${encodeURIComponent(productId)}`);
  return Array.isArray(res) ? res : [];
}

/** Public: highlight reviews (approved, any product) */
export async function getHighlightReviews() {
  const res = await api.get('/reviews/highlights');
  return Array.isArray(res) ? res : [];
}

/** Public: upload one image or video for a customer review (multipart). */
export async function uploadReviewMedia(file, { productId } = {}) {
  if (!file) throw new Error('No file');
  const formData = new FormData();
  formData.append('file', file);
  if (productId) formData.append('productId', productId);
  const base = getApiBase();
  const res = await fetch(`${base}/reviews/upload`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(getApiRequestTimeoutMs()),
  });
  if (!res.ok) {
    const err = new Error(res.statusText || 'Upload failed');
    err.status = res.status;
    try {
      err.body = await res.json();
    } catch {
      err.body = await res.text();
    }
    throw err;
  }
  return res.json();
}

export async function submitReview(productId, { name, rating, body, media }) {
  if (!productId || !body) return { ok: false };
  const payload = {
    productId,
    authorName: name,
    rating,
    body,
  };
  if (Array.isArray(media) && media.length) payload.media = media;
  return api.post('/reviews', payload);
}

/** Admin: list reviews (pool if no productId, or for product) */
export async function getAdminReviews(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') q.set(k, String(v)); });
  const s = q.toString();
  return api.get(`/admin/reviews${s ? `?${s}` : ''}`);
}

export async function createAdminReview(data) {
  return api.post('/admin/reviews', data);
}

export async function updateAdminReview(reviewId, data) {
  return api.patch(`/admin/reviews/${encodeURIComponent(reviewId)}`, data);
}

export async function deleteAdminReview(reviewId) {
  return api.delete(`/admin/reviews/${encodeURIComponent(reviewId)}`);
}

export async function approveReview(reviewId, approved) {
  return api.patch(`/admin/reviews/${encodeURIComponent(reviewId)}/approve`, { approved });
}

export async function assignReviewToProduct(reviewId, productId) {
  return api.patch(`/admin/reviews/${encodeURIComponent(reviewId)}/assign`, { productId });
}

export async function unassignReview(reviewId) {
  return api.patch(`/admin/reviews/${encodeURIComponent(reviewId)}/unassign`);
}

export async function setProductRating(productId, rating, reviewCount) {
  return api.patch(`/admin/reviews/product/${encodeURIComponent(productId)}/rating`, { rating, reviewCount });
}

export async function getAdminCustomers(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return api.get(`/admin/customers${s ? `?${s}` : ''}`);
}

export async function getAdminCustomer(id) {
  return api.get(`/admin/customers/${encodeURIComponent(id)}`);
}

export async function setCustomerBlocked(customerId, blocked) {
  return api.patch(`/admin/customers/${encodeURIComponent(customerId)}/block`, { blocked: !!blocked });
}

export async function registerAdminFcmToken(token) {
  return api.post('/admin/push/fcm-token', { token });
}

export async function getAdminWhatsAppStatus() {
  return api.get('/admin/whatsapp/status');
}

export async function getAdminWhatsAppQR() {
  return api.get('/admin/whatsapp/qr');
}

export async function relinkAdminWhatsApp() {
  return api.post('/admin/whatsapp/relink');
}

export async function getAdminContactSettings() {
  return api.get('/admin/settings/contact');
}

export async function updateAdminContactSettings(data) {
  return api.patch('/admin/settings/contact', data);
}

export async function getAdminContentSettings() {
  return api.get('/admin/settings/content');
}

export async function updateAdminContentSettings(data) {
  return api.patch('/admin/settings/content', data);
}

export async function createSupportTicket(data) {
  return api.post('/support/tickets', data);
}

export async function getMySupportTickets(params = {}) {
  const q = new URLSearchParams(params);
  return api.get(`/support/tickets${q.toString() ? `?${q.toString()}` : ''}`);
}

export async function getAdminSupportTickets(params = {}) {
  const q = new URLSearchParams(params);
  return api.get(`/admin/support${q.toString() ? `?${q.toString()}` : ''}`);
}

export async function updateAdminSupportTicket(id, data) {
  return api.patch(`/admin/support/${encodeURIComponent(id)}`, data);
}

export async function getAdminBlog(params = {}) {
  const q = new URLSearchParams(params);
  return api.get(`/admin/blog?${q.toString()}`);
}

export async function createBlogPost(data) {
  return api.post('/admin/blog', data);
}

export async function updateBlogPost(id, data) {
  return api.patch(`/admin/blog/${encodeURIComponent(id)}`, data);
}

export async function deleteBlogPost(id) {
  return api.delete(`/admin/blog/${encodeURIComponent(id)}`);
}

export async function getBlogImages() {
  return api.get('/admin/blog/images');
}

export async function uploadBlogImage(file, opts = {}) {
  const base = typeof getBase === 'function' ? getBase() : (typeof window !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') : 'http://localhost:4000');
  const url = `${base}/api/v1/admin/blog/upload`;
  const formData = new FormData();
  formData.append('image', file);
  if (opts.slug) formData.append('slug', opts.slug);
  if (opts.alt) formData.append('alt', opts.alt);
  const adminToken = getAdminToken();
  if (typeof opts.onProgress === 'function') {
    return uploadWithProgress(url, formData, adminToken ? { Authorization: `Bearer ${adminToken}` } : {}, { onProgress: opts.onProgress });
  }
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
    credentials: 'include',
    signal: AbortSignal.timeout(getApiRequestTimeoutMs()),
  });
  if (!res.ok) {
    const err = new Error(res.statusText || 'Upload failed');
    err.status = res.status;
    try { err.body = await res.json(); } catch { err.body = await res.text(); }
    throw err;
  }
  return res.json();
}

export async function getAdminDashboard(params = {}) {
  const q = new URLSearchParams();
  if (params.dateFrom) q.set('dateFrom', params.dateFrom);
  if (params.dateTo) q.set('dateTo', params.dateTo);
  const s = q.toString();
  return api.get(`/admin/dashboard${s ? `?${s}` : ''}`);
}

export async function getAdminOrdersSameDay(orderId) {
  return api.get(`/admin/orders/same-day/${encodeURIComponent(orderId)}`);
}

export function isApiConfigured() {
  const base = typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_API_URL : null;
  return !!base || typeof window === 'undefined';
}

export { getApiRequestTimeoutMs } from '@/lib/apiTimeout';
