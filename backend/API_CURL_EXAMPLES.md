# API cURL examples

Base URL: `https://shifaefitrat.com/api/v1`

---

## Public (no auth)

```bash
# Categories
curl -s "https://shifaefitrat.com/api/v1/categories"

# Products (paginated)
curl -s "https://shifaefitrat.com/api/v1/products"
curl -s "https://shifaefitrat.com/api/v1/products?page=1&limit=10"
curl -s "https://shifaefitrat.com/api/v1/products?categoryId=YOUR_CATEGORY_ID"

# Product by slug
curl -s "https://shifaefitrat.com/api/v1/products/slug/painrex-oil"

# Home slider
curl -s "https://shifaefitrat.com/api/v1/slider"

# Blog posts
curl -s "https://shifaefitrat.com/api/v1/blog/posts"
curl -s "https://shifaefitrat.com/api/v1/blog/posts/slug/your-post-slug"
```

---

## Auth

```bash
# Admin login (returns access_token)
curl -s -X POST "https://shifaefitrat.com/api/v1/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@naturesecret.pk","password":"Admin123!"}'

# Customer login
curl -s -X POST "https://shifaefitrat.com/api/v1/auth/customer/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"yourpassword"}'

# Customer register
curl -s -X POST "https://shifaefitrat.com/api/v1/auth/customer/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"new@example.com","password":"secret123","name":"Your Name"}'
```

---

## Admin (Bearer token)

Replace `YOUR_ADMIN_TOKEN` with the `access_token` from admin login.

```bash
TOKEN="YOUR_ADMIN_TOKEN"

# Dashboard
curl -s "https://shifaefitrat.com/api/v1/admin/dashboard" \
  -H "Authorization: Bearer $TOKEN"

# Orders list
curl -s "https://shifaefitrat.com/api/v1/admin/orders" \
  -H "Authorization: Bearer $TOKEN"
curl -s "https://shifaefitrat.com/api/v1/admin/orders?page=1&limit=10&status=pending" \
  -H "Authorization: Bearer $TOKEN"

# Single order
curl -s "https://shifaefitrat.com/api/v1/admin/orders/ORDER_ID" \
  -H "Authorization: Bearer $TOKEN"

# Update order status
curl -s -X PATCH "https://shifaefitrat.com/api/v1/admin/orders/ORDER_ID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"processing"}'

# Admin products
curl -s "https://shifaefitrat.com/api/v1/admin/products" \
  -H "Authorization: Bearer $TOKEN"

# Admin customers
curl -s "https://shifaefitrat.com/api/v1/admin/customers" \
  -H "Authorization: Bearer $TOKEN"

# Slider (admin list)
curl -s "https://shifaefitrat.com/api/v1/slider/admin" \
  -H "Authorization: Bearer $TOKEN"

# Create slide
curl -s -X POST "https://shifaefitrat.com/api/v1/slider" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://example.com/image.jpg","alt":"Hero","title":"Slide","href":"/shop"}'

# Update slide
curl -s -X PATCH "https://shifaefitrat.com/api/v1/slider/SLIDE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated title"}'

# Delete slide
curl -s -X DELETE "https://shifaefitrat.com/api/v1/slider/SLIDE_ID" \
  -H "Authorization: Bearer $TOKEN"

# Admin blog
curl -s "https://shifaefitrat.com/api/v1/admin/blog" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Create order (public)

```bash
curl -s -X POST "https://shifaefitrat.com/api/v1/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName":"Test User",
    "email":"test@example.com",
    "phone":"+923001234567",
    "address":"123 Street, City",
    "total":49900,
    "paymentMethod":"cash_on_delivery",
    "items":[{"productId":"PRODUCT_ID","variantId":"VARIANT_ID","qty":1,"price":49900}]
  }'
```

---

## One-liner: get token then call admin API

```bash
TOKEN=$(curl -s -X POST "https://shifaefitrat.com/api/v1/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@naturesecret.pk","password":"Admin123!"}' | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
echo "Token: $TOKEN"
curl -s "https://shifaefitrat.com/api/v1/admin/dashboard" -H "Authorization: Bearer $TOKEN"
```
