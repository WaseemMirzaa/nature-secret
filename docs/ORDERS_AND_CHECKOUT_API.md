# Orders & Checkout API

## Backend: orders table and related tables

TypeORM creates these when the app starts (with `synchronize: true` in `app.module.ts`):

- **orders** – id (uuid), customerId, customerName, email, phone, address, total, status, paymentMethod, createdAt, dispatchedAt, confirmationCode
- **order_items** – id, orderId, productId, variantId, qty, price
- **order_status_timeline** – id, orderId, status, changedAt, changedBy

**Verify tables exist (on server):**

```bash
mysql -u nature_secret -p nature_secret -e "SHOW TABLES LIKE 'order%';"
# Expect: order_items, order_status_timeline, orders
```

---

## Order-related APIs

### Frontend (admin) → Backend

| Purpose           | Frontend API              | Backend route                    | Auth        |
|------------------|---------------------------|----------------------------------|-------------|
| List orders      | `getAdminOrders(params)`  | GET /api/v1/admin/orders         | Admin JWT   |
| Order detail     | `getAdminOrder(id)`       | GET /api/v1/admin/orders/:id     | Admin JWT   |
| Update status    | `updateOrderStatus(id, s)` | PATCH /api/v1/admin/orders/:id/status | Admin JWT   |
| Dashboard stats  | (used by admin dashboard) | GET /api/v1/admin/dashboard      | Admin JWT   |

### Frontend (checkout) → Backend

| Purpose     | Frontend API           | Backend route      | Auth           |
|------------|------------------------|--------------------|----------------|
| Place order| `createOrder(payload)`  | POST /api/v1/orders | Customer JWT   |

- **createOrder** is called from `app/checkout/page.js` with cart items, address, total, paymentMethod.
- Backend expects: `customerName`, `email`, `phone`, `address`, `total`, `paymentMethod`, `items` (array of `{ productId, variantId, qty, price }`).
- Customer must be logged in; token is sent via `Authorization: Bearer <customer_token>` (see `lib/api.js`: paths starting with `/orders` use customer token).

---

## Quick checks

**1. Admin orders page not loading**

- Backend: ensure `FRONTEND_ORIGIN` includes your frontend domain so CORS allows the request.
- Frontend: ensure admin is logged in (token in `localStorage.nature_secret_admin`). Requests go to `NEXT_PUBLIC_API_URL` + `/api/v1/admin/orders`.
- If API returns 500, backend now returns `{ data: [], total: 0 }` so the page still loads; check backend logs for `getOrders failed` and fix DB/tables.

**2. Checkout not creating orders**

- Customer must be logged in (customer token required for POST /orders).
- Test: `curl -X POST https://api.naturesecret.pk/api/v1/orders -H "Content-Type: application/json" -H "Authorization: Bearer CUSTOMER_TOKEN" -d '{"customerName":"Test","email":"t@t.com","phone":"","address":"A","total":99900,"paymentMethod":"cash_on_delivery","items":[{"productId":"...","variantId":"...","qty":1,"price":49900}]}'`
- Backend creates row in `orders` and `order_items`, and first row in `order_status_timeline`.

**3. Orders table missing**

- Restart the backend so TypeORM runs with `synchronize: true`; it will create missing tables.
- Or run migrations if you use them instead of synchronize.
