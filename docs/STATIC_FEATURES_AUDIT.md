# Nature Secret – Static features audit

Features that still use **Zustand store or dummy-data** instead of the backend API.

---

## 1. **Products**
- **Shop page** (`/shop`) – list from `useProductsStore`
- **Product detail** (`/shop/[slug]`) – from store by slug
- **Homepage** – bestsellers from `useProductsStore`
- **Cart drawer** – product names from store
- **Wishlist** – products from store
- **Checkout** – product names for line items from store
- **Admin orders** – product names for invoice from store (when using API orders, product names come from API order response if we include them)
- **Admin products** – list, add, edit, view, delete from store only (no API CRUD yet)

**Fix:** Fetch products/categories from API when `NEXT_PUBLIC_API_URL` is set; keep store as fallback and for cart item resolution. Admin products: use API when token exists (backend needs product create/update/delete).

---

## 2. **Categories**
- **Shop** – filter dropdown from `CATEGORIES` in dummy-data
- **Admin products** (new/edit) – category dropdown from dummy-data

**Fix:** Use `getCategories()` from API when available; fallback to dummy-data.

---

## 3. **Blog**
- **Blog list** (`/blog`) – `useBlogStore.posts`
- **Blog detail** (`/blog/[slug]`) – post from store; related products from store
- **Admin blog** – list, add, edit, delete from store; templates/categories from `BLOG_TEMPLATES`, `BLOG_CATEGORIES`

**Fix:** Fetch blog from API (`/blog/posts`, `/blog/posts/slug/:slug`); admin blog from API when token exists (backend has getAdminBlog; may need create/update).

---

## 4. **Admin dashboard**
- **Dashboard** (`/admin`) – stats (total sales, orders count, today) from `useOrdersStore` only

**Fix:** When admin has token, call `getAdminDashboard()` and show API stats; fallback to local orders.

---

## 5. **Admin order detail**
- **Order detail** (`/admin/orders/[id]`) – order from `useOrdersStore`; status update to store only when not using API

**Fix:** When token exists, fetch order by id via `getAdminOrder(id)` and use `updateOrderStatus` from API for status changes.

---

## 6. **Admin customers**
- **Customers list** – derived from orders in store (no real customer entity)
- **Customer detail** – orders + notes from store

**Fix:** When token exists, use `getAdminCustomers()` and `getAdminCustomer(id)`.

---

## 7. **Admin analytics**
- **Analytics page** – sessions and visitors from `useAnalyticsStore`; product names from `useProductsStore`
- **Session / visitor detail** – events from store

**Fix:** Backend needs admin analytics endpoints (sessions, visitors, events). Then frontend uses API when token exists.

---

## 8. **Customer auth (AuthModal)**
- **Login / signup** – only updates local `useCustomerStore` (email, name); no password, no API

**Fix:** Call `customerLogin` / `customerRegister` from API with password; store token and user in localStorage; keep store in sync.

---

## 9. **Static content (no API)**
- **Homepage** – `COLLECTIONS`, `TESTIMONIALS`, `TRUST_BADGES`, `PRESS` from dummy-data
- **Product page** – `SHIPPING_POLICY`, `RETURN_POLICY` from dummy-data
- **Admin blog** – `BLOG_TEMPLATES`, `BLOG_CATEGORIES` from dummy-data

**Fix:** Can stay static for now (content). Optionally later: CMS or API for testimonials/collections.

---

## Summary

| Area            | Static? | Status |
|-----------------|--------|--------|
| Products (shop) | Was    | **Fixed** – useProductsAndCategories + API fallback |
| Categories      | Was    | **Fixed** – from API in shop/home |
| Blog            | Yes    | Partially – getBlogPosts/getBlogPostBySlug in api.js; pages can use when ready |
| Admin dashboard | Was    | **Fixed** – getAdminDashboard + getAdminOrders when token |
| Admin order detail | Was  | **Fixed** – getAdminOrder + apiUpdateOrderStatus when token |
| Admin customers | Yes    | API available; list/detail pages can switch when token |
| Admin products  | Yes    | API getAdminProducts; CRUD not in backend yet |
| Admin analytics | Yes    | Backend has track only; admin aggregation API TBD |
| Customer auth   | Was    | **Fixed** – AuthModal uses customerLogin/customerRegister |
| Home/static content | Yes | Kept static (COLLECTIONS, TESTIMONIALS, etc.) |
