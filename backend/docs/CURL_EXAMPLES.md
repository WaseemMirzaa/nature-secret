# Backend API – curl examples

Base URL (local): `http://localhost:4000`. Production: use your API host (e.g. `https://api.naturesecret.pk`).

---

## Health (no auth)

```bash
curl -s http://localhost:4000/health
curl -s http://localhost:4000/api/v1/health
```

---

## Auth

**Admin login** (returns JWT):

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"YourPassword123"}'
```

**Admin register**:

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/admin/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"YourPassword123"}'
```

**Customer login**:

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/customer/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"UserPass123"}'
```

**Customer register**:

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/customer/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"UserPass123","name":"John Doe"}'
```

---

## Public (no auth)

**Products list**:

```bash
curl -s http://localhost:4000/api/v1/products
```

**Product by slug**:

```bash
curl -s http://localhost:4000/api/v1/products/slug/your-product-slug
```

**Product by id**:

```bash
curl -s http://localhost:4000/api/v1/products/1
```

**Categories**:

```bash
curl -s http://localhost:4000/api/v1/categories
curl -s http://localhost:4000/api/v1/categories/1
```

**Blog posts**:

```bash
curl -s http://localhost:4000/api/v1/blog/posts
curl -s http://localhost:4000/api/v1/blog/posts/slug/my-post
curl -s http://localhost:4000/api/v1/blog/posts/1
```

**Slider**:

```bash
curl -s http://localhost:4000/api/v1/slider
```

---

## Orders (public POST)

**Create order**:

```bash
curl -s -X POST http://localhost:4000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "total": 2999,
    "customerName": "Jane",
    "email": "jane@example.com",
    "phone": "+92123456789",
    "address": "City, Street 1",
    "paymentMethod": "cod",
    "items": [
      {"productId": "1", "qty": 2, "price": 1500},
      {"productId": "2", "variantId": "v1", "qty": 1, "price": 999}
    ]
  }'
```

---

## Analytics

**Track event**:

```bash
curl -s -X POST http://localhost:4000/api/v1/analytics/track \
  -H "Content-Type: application/json" \
  -d '{"type":"page_view","sessionId":"sess-123","path":"/products"}'
```

---

## Customer (JWT required)

**Me** (use token from customer login):

```bash
curl -s http://localhost:4000/api/v1/customers/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Admin (admin JWT required)

**Dashboard**:

```bash
curl -s http://localhost:4000/api/v1/admin/dashboard \
  -H "Authorization: Bearer ADMIN_JWT"
```

**Orders list**:

```bash
curl -s http://localhost:4000/api/v1/admin/orders \
  -H "Authorization: Bearer ADMIN_JWT"
```

**Order by id**:

```bash
curl -s http://localhost:4000/api/v1/admin/orders/1 \
  -H "Authorization: Bearer ADMIN_JWT"
```

**Update order status**:

```bash
curl -s -X PATCH http://localhost:4000/api/v1/admin/orders/1/status \
  -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"status":"shipped"}'
```

**Products list**:

```bash
curl -s http://localhost:4000/api/v1/admin/products \
  -H "Authorization: Bearer ADMIN_JWT"
```

**Customers list**:

```bash
curl -s http://localhost:4000/api/v1/admin/customers \
  -H "Authorization: Bearer ADMIN_JWT"
```

**Blog list**:

```bash
curl -s http://localhost:4000/api/v1/admin/blog \
  -H "Authorization: Bearer ADMIN_JWT"
```

---

## Setup (no auth – use only in dev/setup)

**Seed admin**:

```bash
curl -s -X POST http://localhost:4000/api/v1/setup/seed-admin
```

**Seed categories**:

```bash
curl -s -X POST http://localhost:4000/api/v1/setup/seed-categories
```
