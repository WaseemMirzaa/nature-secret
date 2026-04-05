# Meta events — short field & URL summary

**Where things go**

| Path | Domain / URL |
|------|----------------|
| **Pixel (browser)** | Script: `https://connect.facebook.net/.../fbevents.js`. Events run on your **storefront** origin (`window.location.origin` — production site from your Next deploy / env). |
| **CAPI relay (browser → your API)** | `POST {NEXT_PUBLIC_API_URL}/api/v1/analytics/meta-capi` (your backend, e.g. `NEXT_PUBLIC_API_URL` = `https://naturesecret.pk` → `POST https://naturesecret.pk/api/v1/analytics/meta-capi`). |
| **CAPI → Meta** | Your server calls `https://graph.facebook.com/v21.0/{META_PIXEL_ID}/events`. |

**`event_source_url` (CAPI only):** storefront URL with `/shop/{slug}` collapsed to `/shop` (no slug text). **Pixel** still sees the real page URL in the browser (that full URL can still contain a readable slug in the path — we do **not** put product or category **names** or **descriptions** in Pixel/CAPI **parameters**).

### Does Meta “understand” hashed user data?

- **CAPI:** Yes. Meta’s API is built for **SHA256-hashed**, normalized `user_data` (`em`, `ph`, `fn`, `ln`, address fields, etc.). They use those hashes for **matching** to Meta accounts and attribution — not as human-readable text.
- **Pixel (this app):** Purchase **Advanced Matching** uses `fbq('set','user_data', …)` with **plaintext** email/phone/name/address; Meta applies their own processing/hashing on receipt. CAPI duplicates the same person with **server-side hashes** so browser + server events can dedupe and match.

---

## Never sent to Meta (Pixel or CAPI)

- Product **name**, category **name**, product **description**, or Meta’s per-line **`contents`** array (with titles).
- Only **string ids**: `content_ids` (advertising id and/or product UUID), `content_category_ids` (category advertising id and/or category id), plus `value`, `currency`, `num_items`, `content_type`, `order_id`, and purchase **hashed** PII / address fields on the server.
- The API **`POST …/meta-capi`** uses a strict DTO: unknown JSON properties are **rejected** (not silently dropped into Meta).

---

## Fields by event

Legend: **Std** = standard Meta name · **Cust** = custom `NS_EV_*` · **Ads ID** = product Advertising ID only · **Meta ID** = Ads ID or product UUID · **Cat** = category advertising id or category id · **PII** = purchase-only, hashed on server (`em`, `ph`, `fn`/`ln`, `street`, `ct`, `st`, `zp`, `country`).  
Non-purchase CAPI: **`user_data`** ≈ `fbp`, `fbc`, `client_user_agent`, `client_ip_address` only (plus hashed PII **never** applied outside Purchase).

| Event | Pixel `custom_data` (and options) | CAPI `custom_data` + notes |
|--------|-----------------------------------|----------------------------|
| **PageView** | *(none)* | *not sent by this app* |
| **NS_EV_LANDING_PAGE_VIEW** (session) | `value` 0, `currency`, `content_ids` [pathname], `content_type` home, `num_items` 0 | + `contentType` home; same `event_id` as Pixel |
| **NS_EV_LANDING_PAGE_VIEW** (PDP) | `value`, `currency`, `content_ids` [Meta ID], `content_category_ids` [Cat], `content_type` product, `num_items` 1 | same |
| **ViewContent** (Std) | `content_type`, `value`, `currency`, `num_items`, `content_ids` if Ads ID | `content_ids` Ads ID only; `num_items`; **no PII** |
| **NS_EV_CONTENT_VIEW** | `value`, `currency`, `content_ids` [Meta ID], `content_category_ids`, `content_type`, `num_items` | + `categoryIds` |
| **AddToCart** (Std) | `content_type`, `value`, `currency`, `num_items`, `content_ids` if Ads ID | Ads IDs only; **no PII** |
| **NS_EV_ATC** | `content_ids` [Meta ID], `content_category_ids`, `value`, `currency`, `num_items`, `content_type` | + `categoryIds` |
| **AddToWishlist** (Std) | `content_type`, `value`, `currency`, `num_items`, `content_ids` if Ads ID | same; **no PII** |
| **InitiateCheckout** (Std) | `value`, `currency`, `content_type`, `num_items`, `content_ids` Ads IDs | Ads IDs; **no PII** |
| **NS_EV_INTCHECKOUT** | `content_ids` [Meta IDs], `content_category_ids`, `value`, `currency`, `num_items`, `content_type` | + `categoryIds` |
| **Purchase** (Std) | `order_id`, `value`, `currency`, `content_type`, `num_items`, `content_ids` if Ads IDs; Pixel **`user_data`** set only here (email, phone, name, address, city, zip, country, `external_id`) | Same custom_data + **PII** hashed in `user_data` |
| **NS_EV_PRCHS_SUCCESS** | `order_id`, `content_ids`, `content_category_ids`, `value`, `currency`, `num_items`, `content_type` | Same custom_data + **same PII** as Purchase |

No product **name** or **description** in any parameter. Purchase is the **only** event with customer PII (Pixel + CAPI).

### Admin-only: fake / void signal

| **NS_EV_ORDER_VOID** | *(no Pixel)* | Server **CAPI** only: `order_id`, `value` (order total, major units), `currency`, `num_items` 0; **user_data** hashed `em` / `ph` when present; **`custom_data.campaign_id` / `adset_id` / `ad_id`** when the matching `purchase` analytics row has URL attribution. Stable `event_id` `ns_void_{orderId}`. Fired once per order (`orders.metaVoidSentAt`). **POST** `/api/v1/admin/orders/:id/meta-notify-fake-purchase` (admin role). |

---

*Source of truth: `lib/analytics.js`, `backend/.../meta-conversions.service.ts`.*
