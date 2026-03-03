# Nature Secret — Backend & Hosting Architecture Plan

**Stack:** Next.js (frontend) + NestJS (API) + MySQL (DB)  
**Hosting:** Hostinger Business plan (50 GB NVMe, 3 GB MySQL per DB, 5 Node.js apps)

---

## 1. Deployment layout on Hostinger Business

| App | Role | Node.js app | Port / URL |
|-----|------|-------------|------------|
| **Frontend** | Next.js (SSR + static) | 1 app | e.g. `nature-secret.com` |
| **Backend API** | NestJS | 1 app | e.g. `api.nature-secret.com` or subfolder |
| **MySQL** | Hostinger MySQL | Built-in | Single DB (stay under 3 GB) |

- Use **2 of 5** Node.js app slots (frontend + API). Keep rest for staging or future services.
- Frontend and API can share a domain (e.g. `/api` → API) or use subdomains; subdomain is cleaner for CORS and cookies.

---

## 2. High-level architecture

```
[User] → [Next.js - Hostinger] → [NestJS API - Hostinger] → [MySQL - Hostinger]
           (SSR/static)              (REST + auth)              (single DB)
```

**Principles:**

- **Single source of truth:** All mutable data (products, orders, blog, analytics, customers) in MySQL. Frontend reads from API; Zustand only for UI state (cart, modal) and optional client cache.
- **API-first:** NestJS exposes REST (or GraphQL later). Next.js calls API via `fetch` or a small API client; no direct DB access from Next.js.
- **Stateless API:** No server-side session store; JWT (or session token in cookie) for auth. Fits Hostinger’s single-instance Node.js apps.
- **Performance:** Connection pooling, indexed queries, pagination, compression, and cache headers so the app stays fast and dynamic within Hostinger limits.

---

## 3. NestJS backend structure

### 3.1 Recommended folder layout

```
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/           # Guards, decorators, filters, interceptors
│   │   ├── auth/
│   │   ├── pagination/
│   │   └── cache/
│   ├── config/           # ConfigModule (env)
│   ├── database/         # TypeORM config, migrations
│   ├── modules/
│   │   ├── auth/         # Login (admin, staff, customer), JWT
│   │   ├── products/    # CRUD, variants, categories
│   │   ├── orders/      # CRUD, status, status_timeline
│   │   ├── customers/   # Profile, notes
│   │   ├── blog/        # Posts, templates, categories
│   │   ├── analytics/    # Events, sessions, visitor aggregation
│   │   ├── categories/  # Product categories (admin CRUD)
│   │   └── admin/       # Dashboard stats, discount codes
│   └── ...
├── package.json
├── tsconfig.json
├── .env.example
└── ...
```

### 3.2 Core tech choices

| Concern | Choice | Why |
|--------|--------|-----|
| **ORM** | TypeORM | Good MySQL support, migrations, relations; fits NestJS. |
| **Validation** | `class-validator` + `class-transformer` | DTOs and pipes; keep payloads safe and typed. |
| **Auth** | `@nestjs/jwt` + `passport` | Stateless JWT for admin/staff and customer; optional HTTP-only cookie for customer. |
| **Config** | `@nestjs/config` | Env-based (DB URL, JWT secret, Hostinger env). |
| **Compression** | `compression` middleware | Gzip responses for faster transfer. |

### 3.3 API versioning and base path

- Global prefix: `/api/v1`.
- Example: `GET /api/v1/products`, `PATCH /api/v1/orders/:id/status`.
- Keeps room for future v2 without breaking the frontend.

---

## 4. Database schema (MySQL)

Single database; all tables in one schema. Stay under 3 GB (Hostinger Business).

### 4.1 Tables (aligned with current frontend)

| Table | Purpose |
|-------|--------|
| `categories` | Product categories (e.g. Herbal Oils, Skin Care). |
| `products` | Core product fields (name, slug, description, price, badge, inventory, etc.). |
| `product_variants` | Variant (e.g. 50ml, 100ml): product_id, name, volume, price, image. |
| `product_images` | Optional: product_id, url, sort_order (or store JSON array in `products` to keep it simple initially). |
| `orders` | order_id, customer_id (nullable), guest email/name/phone/address, total, status, payment_method, created_at, dispatched_at. |
| `order_items` | order_id, product_id, variant_id, qty, price. |
| `order_status_timeline` | order_id, status, changed_at, changed_by ('admin'|'staff'|'system'). |
| `customers` | id, email, name, phone, address (optional), created_at. |
| `customer_notes` | customer_id, note, created_at, created_by. |
| `blog_posts` | id, slug, title, body, template_id, category_id, image, published_at, created_at, updated_at. |
| `blog_categories` | id, name, slug. |
| `blog_templates` | id, name (e.g. "Minimal", "Feature"). |
| `admin_users` | id, email, password_hash, role ('admin'|'staff'), 2fa_secret (nullable). |
| `analytics_events` | id, type, session_id, path, product_id, order_id, customer_email, customer_name, timestamp, payload (JSON). |
| `discount_codes` | code, percent_off, valid_from, valid_until. |

### 4.2 Indexes (for fast loading)

- **products:** `slug` (unique), `category_id`, `created_at`.  
- **orders:** `created_at`, `status`, `email` (for lookup).  
- **order_items:** `order_id`.  
- **order_status_timeline:** `order_id`, `changed_at`.  
- **analytics_events:** `session_id`, `timestamp`, `customer_email`, `type`.  
- **blog_posts:** `slug` (unique), `published_at`, `category_id`.  
- **customers:** `email` (unique).  

Use TypeORM migrations so schema and indexes are versioned and repeatable.

---

## 5. API design (REST)

### 5.1 Public (storefront)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/products` | List products (query: category, sort, page, limit). |
| GET | `/api/v1/products/:slug` | Product by slug (detail + variants). |
| GET | `/api/v1/categories` | List categories. |
| GET | `/api/v1/blog/posts` | List published posts (page, limit, category). |
| GET | `/api/v1/blog/posts/:slug` | Post by slug. |
| POST | `/api/v1/orders` | Create order (guest or with customer token). |
| POST | `/api/v1/auth/register` | Customer signup. |
| POST | `/api/v1/auth/login` | Customer login (returns JWT). |
| GET | `/api/v1/customers/me` | Current customer (JWT). |
| PATCH | `/api/v1/customers/me` | Update profile. |
| POST | `/api/v1/analytics/track` | Send analytics event (optional auth). |

### 5.2 Admin / staff (JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/admin/auth/login` | Admin/staff login (JWT). |
| GET | `/api/v1/admin/orders` | Orders (filters: status, dateFrom, dateTo, search; pagination). |
| GET | `/api/v1/admin/orders/:id` | Order detail + timeline. |
| PATCH | `/api/v1/admin/orders/:id/status` | Update status (body: status); append to timeline with changed_by from JWT. |
| GET | `/api/v1/admin/products` | Products (search, pagination). |
| GET | `/api/v1/admin/products/:id` | Product detail. |
| POST | `/api/v1/admin/products` | Create product. |
| PATCH | `/api/v1/admin/products/:id` | Update product (bestseller, stock, etc.). |
| GET | `/api/v1/admin/customers` | Customers (search, pagination). |
| GET | `/api/v1/admin/customers/:id` | Customer + orders + notes. |
| GET | `/api/v1/admin/blog` | Blog posts (pagination, filters). |
| GET | `/api/v1/admin/blog/:id` | Post detail. |
| POST | `/api/v1/admin/blog` | Create post. |
| PATCH | `/api/v1/admin/blog/:id` | Update post. |
| GET | `/api/v1/admin/analytics/*` | Sessions, visitors, aggregates (date range, filters). |
| GET | `/api/v1/admin/dashboard` | Summary stats (sales, orders today, etc.). |

### 5.3 Pagination and filters

- **Consistent format:** `?page=1&limit=20` (default limit 20, max 100).
- **Response:** `{ data: T[], total: number, page, limit, totalPages }`.
- **Filters:** Pass as query params (e.g. `status=pending`, `dateFrom=`, `dateTo=`). Keeps URLs cacheable and links shareable.

---

## 6. Keeping loading time fast and dynamic

### 6.1 Backend (NestJS)

| Practice | How |
|----------|-----|
| **Connection pooling** | TypeORM MySQL pool (default); keep pool size modest (e.g. 10) to avoid exhausting DB connections on Hostinger. |
| **Indexes** | As in §4.2; avoid full table scans on lists and filters. |
| **Select only needed columns** | No `SELECT *` on large tables; use query builder or select in repository. |
| **Pagination** | Always paginate list endpoints; no “return all orders”. |
| **Response compression** | Enable gzip in NestJS (e.g. `compression` middleware) for JSON and text. |
| **Cache headers** | For rarely changing data: `Cache-Control: public, max-age=60` (e.g. categories, product list). For real-time: `Cache-Control: no-store` or short max-age (e.g. order list in admin). |
| **ETag / If-None-Match** | Optional: compute ETag for product/list responses; return 304 when unchanged. |

### 6.2 Frontend (Next.js)

| Practice | How |
|----------|-----|
| **SSR for SEO** | Keep current approach: homepage, shop, blog list/detail as server components where possible; fetch from API in server components or via `getServerSideProps`-style data fetching so first paint is fast. |
| **Dynamic where needed** | Admin and cart/checkout stay client-side; call API from client. Use SWR or React Query (or simple fetch + state) with stale-while-revalidate so UI feels instant and data stays fresh. |
| **Lazy load admin lists** | Already paginated; load next page on scroll or “Load more” / page buttons. |
| **Optimistic updates** | For status change, cart update: update UI immediately, then sync with API; rollback on error. |
| **Minimal payload** | API returns only fields needed per screen (e.g. list vs detail DTOs). |

### 6.3 Hostinger-specific

- **Single process:** One NestJS process per Node app; no cluster on Business. Rely on connection pool and efficient queries.
- **Cold starts:** If Hostinger spins down after inactivity, first request may be slower; keep “always on” if the plan offers it, or accept short delay after idle.
- **MySQL 3 GB:** Monitor DB size; archive old analytics or orders if needed; keep indexes lean.

---

## 7. Security

- **Env:** All secrets in env (`.env` on server, not in repo): `DB_URL`, `JWT_SECRET`, `ADMIN_JWT_SECRET` (optional separate for admin).
- **HTTPS:** Enforce TLS (Hostinger provides SSL).
- **CORS:** Restrict origin to your frontend domain(s).
- **Rate limiting:** Use `@nestjs/throttler` to limit auth and public POST endpoints.
- **SQL:** TypeORM parameterized queries only; no raw concatenation.
- **Auth:** Hash passwords (bcrypt); JWT short-lived (e.g. 24h) with refresh or re-login; staff can only change order status, not delete orders or alter other admins.

---

## 8. Frontend migration path (Zustand → API)

1. **Introduce API client** (e.g. `lib/api.js`): base URL from env, `get/post/patch` helpers, attach JWT for admin/customer routes.
2. **Products & categories:** Replace Zustand products/categories with API calls. Keep Zustand for cart (and sync cart to API on checkout if you add “logged-in cart” later).
3. **Orders:** Checkout POSTs to `/api/v1/orders`; order confirmation reads from API or response. Admin orders list/detail and status change call API.
4. **Blog:** List and detail from API; admin create/edit from API.
5. **Customers:** Login/register via API; store JWT in memory or httpOnly cookie; “me” and profile update from API.
6. **Analytics:** Frontend sends events to `/api/v1/analytics/track`; admin analytics read from API.
7. **Admin auth:** Login to NestJS; store JWT; use in `Authorization` header for all admin requests.

Keep existing Zustand for: cart contents, wishlist, auth modal open state, and optionally cached product list (invalidated after X minutes or on focus).

---

## 9. Implementation order (backend)

1. **Scaffold NestJS:** Config, TypeORM, MySQL connection, compression.  
2. **Auth module:** Admin login, JWT, guard; then customer register/login and guard.  
3. **Categories + Products:** CRUD, variants, categories; public list/detail endpoints.  
4. **Orders:** Create order, order list/detail, status update + timeline.  
5. **Customers:** Profile, notes (admin).  
6. **Blog:** CRUD, templates, public list/detail.  
7. **Analytics:** Store event endpoint; admin aggregation/sessions/visitors.  
8. **Dashboard & discount codes:** Stats endpoint; discount validation and storage.  
9. **Migrations:** Initial schema + indexes; run on Hostinger DB.  
10. **Frontend:** Wire Next.js to API step by step (products → orders → blog → admin).

---

## 10. Summary

- **Hostinger Business:** 2 Node.js apps (Next.js + NestJS), 1 MySQL DB (under 3 GB).  
- **Architecture:** Clear separation: frontend (Next.js), backend (NestJS REST API), DB (MySQL); stateless API with JWT.  
- **Backend:** Modular NestJS with TypeORM, DTOs, guards, compression, and cache headers.  
- **Performance:** Pooling, indexes, pagination, compression, and careful caching so the app stays fast and dynamic on shared hosting.  
- **Migration:** Replace Zustand-backed data with API client and server/client fetching while keeping cart and UI state in Zustand.

This plan keeps loading times low and the app dynamic while staying within Hostinger Business limits and using MySQL as the single source of truth.
