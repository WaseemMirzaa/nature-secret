/**
 * API client for Nature Secret backend. All requests use parameterized data (no SQL injection).
 * Use for server and client; env NEXT_PUBLIC_API_URL for browser.
 */
const BASE = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  : (typeof window !== 'undefined' && window.__NEXT_PUBLIC_API_URL__) || 'http://localhost:4000';

const API_BASE = `${BASE}/api/v1`;

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
};

/** Admin auth */
export async function adminLogin(email, password) {
  const data = await api.post('/auth/admin/login', { email, password });
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

/** Admin (requires token) */
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

export async function getAdminDashboard() {
  return api.get('/admin/dashboard');
}

export function isApiConfigured() {
  const base = typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_API_URL : null;
  return !!base || typeof window === 'undefined';
}
