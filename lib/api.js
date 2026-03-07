/**
 * API client for Nature Secret backend. All requests use parameterized data (no SQL injection).
 * Use for server and client; env NEXT_PUBLIC_API_URL for browser.
 */
function getBase() {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL)
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.__NEXT_PUBLIC_API_URL__)
    return window.__NEXT_PUBLIC_API_URL__;
  return 'http://localhost:4000';
}
const API_BASE = `${getBase()}/api/v1`;

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

function getCustomerToken() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('nature_secret_customer_token');
    return raw || null;
  } catch {
    return null;
  }
}

export async function apiRequest(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const adminToken = getAdminToken();
  const customerToken = getCustomerToken();
  if (adminToken) headers.Authorization = `Bearer ${adminToken}`;
  else if (customerToken) headers.Authorization = `Bearer ${customerToken}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
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

export async function getCategories() {
  return api.get('/categories');
}

export async function createOrder(orderPayload) {
  return api.post('/orders', orderPayload);
}

export async function trackAnalytics(event) {
  try {
    await api.post('/analytics/track', event);
  } catch (_) {}
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

export async function uploadSlideImage(file, opts = {}) {
  const url = `${API_BASE}/slider/upload`;
  const formData = new FormData();
  formData.append('image', file);
  if (opts.slug) formData.append('slug', opts.slug);
  if (opts.alt) formData.append('alt', opts.alt);
  const adminToken = getAdminToken();
  const res = await fetch(url, { method: 'POST', body: formData, headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {}, credentials: 'include' });
  if (!res.ok) {
    const err = new Error(res.statusText || 'Upload failed');
    err.status = res.status;
    try { err.body = await res.json(); } catch { err.body = await res.text(); }
    throw err;
  }
  return res.json();
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
  const url = `${API_BASE}/admin/products/upload`;
  const formData = new FormData();
  formData.append('image', file);
  if (opts.slug) formData.append('slug', opts.slug);
  if (opts.alt) formData.append('alt', opts.alt);
  const adminToken = getAdminToken();
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
    credentials: 'include',
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
  const q = new URLSearchParams(params);
  return api.get(`/admin/orders?${q.toString()}`);
}

export async function getAdminOrder(id) {
  return api.get(`/admin/orders/${encodeURIComponent(id)}`);
}

export async function updateOrderStatus(orderId, status) {
  return api.patch(`/admin/orders/${encodeURIComponent(orderId)}/status`, { status });
}

export async function getAdminProducts(params = {}) {
  const q = new URLSearchParams(params);
  return api.get(`/admin/products?${q.toString()}`);
}

export async function getAdminCustomers(params = {}) {
  const q = new URLSearchParams(params);
  return api.get(`/admin/customers?${q.toString()}`);
}

export async function getAdminCustomer(id) {
  return api.get(`/admin/customers/${encodeURIComponent(id)}`);
}

export async function getAdminBlog(params = {}) {
  const q = new URLSearchParams(params);
  return api.get(`/admin/blog?${q.toString()}`);
}

export async function getBlogImages() {
  return api.get('/admin/blog/images');
}

export async function uploadBlogImage(file, opts = {}) {
  const url = `${API_BASE}/admin/blog/upload`;
  const formData = new FormData();
  formData.append('image', file);
  if (opts.slug) formData.append('slug', opts.slug);
  if (opts.alt) formData.append('alt', opts.alt);
  const adminToken = getAdminToken();
  const res = await fetch(url, { method: 'POST', body: formData, headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {}, credentials: 'include' });
  if (!res.ok) {
    const err = new Error(res.statusText || 'Upload failed');
    err.status = res.status;
    try { err.body = await res.json(); } catch { err.body = await res.text(); }
    throw err;
  }
  return res.json();
}

export async function getAdminDashboard() {
  return api.get('/admin/dashboard');
}

export function isApiConfigured() {
  const base = typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_API_URL : null;
  return !!base || typeof window === 'undefined';
}
