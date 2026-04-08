# Meta events — short field & URL summary

**Where things go**

| Path | Domain / URL |
|------|----------------|
| **Pixel (browser)** | Script: `https://connect.facebook.net/.../fbevents.js`. Events run on your **storefront** origin (`window.location.origin` — production site from your Next deploy / env). |
| **CAPI relay (browser → your API)** | `POST {NEXT_PUBLIC_API_URL}/api/v1/analytics/meta-capi` (your backend, e.g. `NEXT_PUBLIC_API_URL` = `https://naturesecret.pk` → `POST https://naturesecret.pk/api/v1/analytics/meta-capi`). |
| **CAPI → Meta** | Your server calls `https://graph.facebook.com/v21.0/{META_PIXEL_ID}/events`. |

**`event_source_url` (CAPI only):** full current page URL (`href`, including path, query, hash), capped at 2000 chars — e.g. `https://naturesecret.pk/shop/{uuid}?…`. **`campaign_id` / `adset_id` / `ad_id` on CAPI** are **numeric Meta ids only** (not `utm_campaign` names). Relay payloads are **whitelisted** to the Meta CAPI DTO (no stray/product fields). Product **names** / **descriptions** are **not** sent in event params — only ids in `content_ids` / `contents`.

### Does Meta “understand” hashed user data?

- **CAPI:** Yes. Meta’s API is built for **SHA256-hashed**, normalized `user_data` (`em`, `ph`, `fn`, `ln`, address fields, etc.). They use those hashes for **matching** to Meta accounts and attribution — not as human-readable text.
- **Pixel (this app):** Purchase **Advanced Matching** uses `fbq('set','user_data', …)` with **plaintext** email/phone/name/address; Meta applies their own processing/hashing on receipt. CAPI duplicates the same person with **server-side hashes** so browser + server events can dedupe and match.

---

## Never sent to Meta (Pixel or CAPI)

- Product **name**, category **name**, product **description**, or Meta’s per-line **`contents`** array (with titles).
- Only **string ids**: Pixel + CAPI `content_ids` / `contents[].id` = **Advertising ID** when set, else **product UUID** (never product name or slug). `content_category_ids` = category advertising id and/or category id; plus `value`, `currency`, `num_items`, `content_type`, `order_id`, and purchase **hashed** PII / address fields on the server.
- The API **`POST …/meta-capi`** uses a strict DTO: unknown JSON properties are **rejected** (not silently dropped into Meta).

---

## Fields by event

Legend: **Std** = standard Meta name · **Cust** = custom `NS_EV_*` · **Catalog id** = Advertising ID or product UUID (`metaContentId`) · **Cat** = category advertising id or category id · **PII** = purchase-only, hashed on server (`em`, `ph`, `fn`/`ln`, `street`, `ct`, `st`, `zp`, `country`).  
Non-purchase CAPI: **`user_data`** includes `fbp` (brief wait after Pixel load if cookie was missing), `fbc` (cookie or synthetic `fb.1.<ts>.<fbclid>` from stored `fbclid` in URL), `external_id` (SHA256 of stable anonymous or customer id — **not** on Purchase, which uses `order_id`-derived id server-side), plus `client_user_agent` / `client_ip_address`. Hashed PII **never** applied outside Purchase.

| Event | Pixel `custom_data` (and options) | CAPI `custom_data` + notes |
|--------|-----------------------------------|----------------------------|
| **PageView** | *(none)* | *not sent by this app* |
| **NS_EV_LANDING_PAGE_VIEW** (session) | *(no Pixel for this CAPI-only row)* | `content_ids` = route **bucket** only (`home`, `blog`, `shop`, …) — **not** pathname/slug; opaque `event_id`; `contentType` home |
| **NS_EV_LANDING_PAGE_VIEW** (PDP) | `value`, `currency`, `content_ids` [Catalog id], `content_category_ids` [Cat], `content_type` product, `num_items` 1 | same |
| **ViewContent** (Std) | `content_type`, `value`, `currency`, `num_items`, `content_ids` if Ads ID | `content_ids` Ads ID only; `num_items`; **no PII** |
| **NS_EV_CONTENT_VIEW** | `value`, `currency`, `content_ids` [Catalog id], `content_category_ids`, `content_type`, `num_items` | + `categoryIds` |
| **AddToCart** (Std) | `content_type`, `value`, `currency`, `num_items`, `content_ids` if Ads ID | Ads IDs only; **no PII** |
| **NS_EV_ATC** | `content_ids` [Catalog id], `content_category_ids`, `value`, `currency`, `num_items`, `content_type` | + `categoryIds` |
| **AddToWishlist** (Std) | `content_type`, `value`, `currency`, `num_items`, `content_ids` if Ads ID | same; **no PII** |
| **InitiateCheckout** (Std) | `value`, `currency`, `content_type`, `num_items`, `content_ids` Ads IDs | Ads IDs; **no PII** |
| **NS_EV_INTCHECKOUT** | `content_ids` [Catalog ids], `content_category_ids`, `value`, `currency`, `num_items`, `content_type` | + `categoryIds` |
| **Purchase** (Std) | `order_id`, `value`, `currency`, `content_type`, `num_items`, `content_ids` if Ads IDs; Pixel **`user_data`** set only here (email, phone, name, address, city, zip, country, `external_id`) | Same custom_data + **PII** hashed in `user_data` |
| **NS_EV_PRCHS_SUCCESS** | `order_id`, `content_ids` [Catalog ids], `content_category_ids`, `value`, `currency`, `num_items`, `content_type` | Same custom_data + **same PII** as Purchase |

No product **name** or **description** in any parameter. Purchase is the **only** event with customer PII (Pixel + CAPI).

### Admin-only: fake / void signal

| **NS_EV_ORDER_VOID** | *(no Pixel)* | Server **CAPI** only: `order_id`, `value` (order total, major units), `currency`, `num_items` 0; **user_data** hashed `em` / `ph` when present; **`custom_data.campaign_id` / `adset_id` / `ad_id`** when the matching `purchase` analytics row has URL attribution. Stable `event_id` `ns_void_{orderId}`. Fired once per order (`orders.metaVoidSentAt`). **POST** `/api/v1/admin/orders/:id/meta-notify-fake-purchase` (admin role). |

---

### EMQ (Events Manager)

- Turn on **Automatic Advanced Matching** for the Pixel (Events Manager → Settings).
- **Test Events:** use your test code; confirm `user_data` shows **fbp**, **fbc**, **client_user_agent**, **client_ip_address**, **external_id** (hashed on CAPI) on ViewContent / AddToCart / InitiateCheckout / Purchase as applicable.
- **Optional (policy):** hashed **em** / **ph** on upper-funnel events (e.g. InitiateCheckout) increases EMQ but requires consent/legal approval — not enabled by default here.

### AddToCart CAPI consistency

- Standard **AddToCart** + **NS_EV_ATC** share one **`getMetaCapiUserDataAsync()`** per action (single `_fbp` wait, aligned **fbp** / **fbc** / **external_id**).

---

*Source of truth: `lib/analytics.js`, `backend/.../meta-conversions.service.ts`.*
