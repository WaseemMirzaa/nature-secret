# Meta Pixel & CAPI — event data and Events Manager rules

This document describes **what data** the storefront sends to Meta (browser Pixel + server Conversions API relay) and **how to configure** events and conversions in Meta Events Manager.

**Code source:** `lib/analytics.js` (Pixel + `sendMetaCapi` relay) and `backend/src/modules/analytics/meta-conversions.service.ts` (CAPI payload shape).

---

## How events are sent

1. **Pixel (`fbq`)** — fires in the browser when Meta Pixel is enabled for the session (see `lib/meta-pixel-gate.js`).
2. **CAPI relay** — the browser POSTs to `POST /api/v1/analytics/meta-capi`; the API forwards to Meta Graph with **hashed** email/phone when provided.
3. **Deduplication** — for standard events that send both Pixel and CAPI, **`event_id` must match** between Pixel options and CAPI. Custom events use their own `event_id` (separate from the paired standard event).

**CAPI `custom_data` mapping (server):**

| App field | Meta `custom_data` key |
|-----------|-------------------------|
| `contentIds` | `content_ids` (array of strings) |
| `categoryIds` | `content_category_ids` (array of strings) |
| `value` | `value` (number) |
| `currency` | `currency` (3-letter) |
| `numItems` | `num_items` (number) |
| `orderId` | `order_id` (string, when set) |
| `contentType` (optional) | `content_type` (default `"product"` if omitted) |

---

## Content & category IDs (important for catalog / rules)

| Concept | Meaning | Used in |
|--------|---------|--------|
| **Standard Pixel `content_ids`** | Admin **Advertising ID** on the product when set; **otherwise omitted** (not UUID). | Standard `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase` |
| **Custom event `content_ids`** (`NS_EV_*`) | **Meta content id**: Advertising ID if set, **else product UUID** (`metaContentId`). | `NS_EV_ATC`, `NS_EV_CONTENT_VIEW`, `NS_EV_INTCHECKOUT`, `NS_EV_PRCHS_SUCCESS` |
| **`content_category_ids`** | `categoryAdvertisingId` if set, **else** `categoryId`. | Custom NS events + Purchase custom |

Use **the same event names** in Custom conversions / Aggregated Event Measurement as appear in Pixel (custom names are case-sensitive: `NS_EV_PRCHS_SUCCESS`, etc.).

---

## Standard vs custom events (reference)

### PageView

- **Pixel:** `fbq('track', 'PageView')`
- **CAPI:** none from this app (standard PageView only)

### Landing page view

**A) Non–product-detail first page (once per tab session)**  
On the first `trackPageView` when the path is **not** `/shop/:slugOrId`, fires once (sessionStorage `nature_secret_meta_landing_page_view`). If `sessionStorage` is unavailable, at most once per full page load for those paths.

| Channel | Event name | Notes |
|--------|------------|--------|
| Pixel custom | `NS_EV_LANDING_PAGE_VIEW` | `content_ids`: `[pathname]` (max 128 chars); `content_category_ids`: `[]`; `value: 0`, `currency`, `content_type: home`, `num_items: 0` |
| CAPI | `NS_EV_LANDING_PAGE_VIEW` | Same `event_id` as Pixel: `ns_lpv_{safePath}_{timestamp}` (max 128 chars) |

**B) Product detail `/shop/:id` (every open)**  
`trackLandingPageViewForProduct` in `ProductDetailClient` (with `trackViewContent`). Same event name for custom conversions; **product** payload: `content_ids` / `content_category_ids` like other `NS_EV_*` product events, `content_type: product`, `value` / `num_items: 1`, `event_id`: `ns_lpv_p_{contentId}_{timestamp}`.

The session “first page” event is **skipped** on `/shop/:id` so the product row is not duplicated with `content_type: home` + pathname only.

Use this event name in **Custom conversions** the same way as other `NS_EV_*` events.

---

### ViewContent (product page)

| Channel | Event name | Notes |
|--------|------------|--------|
| Pixel | `ViewContent` | `content_ids`: advertising id only if present; `value`, `currency`, `num_items: 1`, `content_type: product` |
| CAPI | `ViewContent` | `event_id`: `vc_{adsId|contentId}_{timestamp}`; `content_ids`: same as Pixel (ads id or empty); `num_items: 1` |
| Pixel custom | `NS_EV_CONTENT_VIEW` | `content_ids`: `[metaContentId]`; `content_category_ids`; `value`, `currency`, `content_type`, `num_items: 1` |
| CAPI | `NS_EV_CONTENT_VIEW` | Same `event_id` as Pixel custom: `ns_vc_{contentId}_{timestamp}`; `contentIds` / `categoryIds` as above |

---

### AddToCart

| Channel | Event name | `event_id` pattern (dedupe with CAPI) |
|--------|------------|----------------------------------------|
| Pixel | `AddToCart` | `std_atc_{adsId|metaId}_{timestamp}` |
| CAPI | `AddToCart` | **same** as Pixel |
| Pixel custom | `NS_EV_ATC` | `ns_atc_{metaId}_{timestamp}` |
| CAPI | `NS_EV_ATC` | **same** as Pixel custom |

**Custom payload:** `content_ids` (meta id), `content_category_ids`, `value` (line total), `currency`, `num_items`, `content_type: product`.

---

### InitiateCheckout (checkout page, cart snapshot)

| Channel | Event name | `content_ids` |
|--------|------------|----------------|
| Pixel | `InitiateCheckout` | Advertising IDs only (for catalog alignment) |
| CAPI | `InitiateCheckout` | **Same `event_id` as Pixel:** `ic_{timestamp}_{random}` |
| Pixel custom | `NS_EV_INTCHECKOUT` | Meta content ids per cart line (ads id or UUID) + `content_category_ids` |
| CAPI | `NS_EV_INTCHECKOUT` | **Same `event_id` as Pixel custom:** `ns_ic_{timestamp}_{random}` |

**Shared fields:** `value` (cart total in major units, e.g. PKR), `currency` (default `PKR`), `num_items` (sum of quantities), `content_type: product`.  
**No `order_id`** on InitiateCheckout.

---

### Purchase (after successful order)

| Channel | Event name | `event_id` |
|--------|------------|------------|
| Pixel | `Purchase` | `std_purchase_{orderId}` |
| CAPI | `Purchase` | **same** |
| Pixel custom | `NS_EV_PRCHS_SUCCESS` | `ns_prch_{orderId}` |
| CAPI | `NS_EV_PRCHS_SUCCESS` | **same** |

**Standard Pixel/CAPI Purchase `content_ids`:** advertising IDs only (when passed from checkout).  
**Custom `NS_EV_PRCHS_SUCCESS`:** full `content_ids` (meta id per line), `content_category_ids`, `order_id`, `value`, `currency`, `num_items`, `content_type`.

**Customer / address (Purchase only):** Pixel `user_data` is set **only** inside `trackPurchase` (via `syncMetaPixelUserDataForPurchase`). **All other** Meta Pixel + CAPI calls do **not** send email, phone, name, or address.  
**CAPI** `Purchase` and `NS_EV_PRCHS_SUCCESS` send **hashed** `user_data`: `em`, `ph`, `fn`/`ln` (from full name), `street` (address line), `ct`, `st` (if provided), `zp` (pincode), `country` (2-letter). Other CAPI events ignore those fields even if present.

---

### AddToWishlist

- **Pixel:** `AddToWishlist` — `content_ids` if advertising id exists; `value`, `currency`, `num_items: 1`, `content_type: product`
- **CAPI:** `AddToWishlist` — same ids/value/`num_items`; no duplicate custom NS event in code today

---

## Events **not** sent to Meta (internal / store only)

These update internal analytics / store only; they do **not** call `fbq` or CAPI in `lib/analytics.js`:

- `trackCheckoutPageView`
- `trackOrderConfirmationView`
- `trackPlaceOrderClick`

---

## Data sent to Meta (no product copy)

- **Standard** Pixel + CAPI events (`ViewContent`, `AddToCart`, `AddToWishlist`, `InitiateCheckout`, `Purchase`): **`content_ids`** only when the product has an **Advertising ID** (otherwise omitted — no UUID, no slug); **`value`**, **`currency`**, **`num_items`**; **`content_type: product`**; **`order_id`** on Purchase only. No **`contents`** array, no **name**, no **description**.
- **Custom** `NS_EV_*` events may also send **`content_category_ids`** and UUIDs in `content_ids` where documented below.
- **Custom / standard** — not product **name** or **description** in parameters.
- **CAPI `event_source_url`** is normalized: paths like `/shop/your-product-slug` are sent as **`origin/shop`** so slug text is not included (Pixel still runs on the real URL in the browser).
- **Purchase only (Pixel + CAPI):** hashed customer **email**, **phone**, **name**, **street**, **city**, **state**, **zip**, **country** — not product copy. **InitiateCheckout** and all other events: **no** customer PII in CAPI `user_data` (only `fbp` / `fbc` / UA / IP where applicable).

---

## Meta Events Manager — practical rules

### 1. Verify Pixel + CAPI

- **Events Manager** → your Pixel → **Test events** (optional test code via `META_TEST_EVENT_CODE` / `NEXT_PUBLIC_META_TEST_EVENT_CODE`).
- Confirm **browser** and **server** show the same standard events with matching **`event_id`** where applicable (Purchase, AddToCart, InitiateCheckout).

### 2. Custom events (`NS_EV_*`)

- They appear as **Custom events** with the **exact names**:  
  `NS_EV_PRCHS_SUCCESS`, `NS_EV_INTCHECKOUT`, `NS_EV_CONTENT_VIEW`, `NS_EV_ATC`, `NS_EV_LANDING_PAGE_VIEW`
- **Custom conversions:** create rules on **Custom event** → name equals (e.g. `NS_EV_PRCHS_SUCCESS`).  
- **Parameters** available for rules (in `custom_data`): e.g. `value`, `currency`, `content_ids`, `content_category_ids`, `num_items`, `order_id` (purchase only).

**Suggested custom conversions (one per row — adjust names for your ad account):**

| Suggested name | Event to match | Rule |
|----------------|----------------|------|
| NS — Purchase (custom) | `NS_EV_PRCHS_SUCCESS` | Event name **equals** `NS_EV_PRCHS_SUCCESS` |
| NS — Initiate checkout (custom) | `NS_EV_INTCHECKOUT` | Event name **equals** `NS_EV_INTCHECKOUT` |
| NS — Content / product view | `NS_EV_CONTENT_VIEW` | Event name **equals** `NS_EV_CONTENT_VIEW` (optional: `content_type` = `product`) |
| NS — Add to cart | `NS_EV_ATC` | Event name **equals** `NS_EV_ATC` |
| NS — Landing / PDP open | `NS_EV_LANDING_PAGE_VIEW` | Event name **equals** `NS_EV_LANDING_PAGE_VIEW` |

Optionally add **standard** conversions separately (`Purchase`, `InitiateCheckout`, `ViewContent`, `AddToCart`) if you optimize on Meta’s standard names — use **one** primary purchase and one checkout signal per campaign to avoid double counting (see §3).

### 3. Deduplication

- Do **not** merge standard and custom into one conversion rule if they use **different** `event_id`s — they are separate hits.
- For **optimization**, pick **one** primary signal per funnel step (e.g. standard `Purchase` **or** `NS_EV_PRCHS_SUCCESS`, not double-counting in the same ad set goal unless intentional).

### 4. Value & currency

- `value` is in **major currency units** (e.g. PKR as in the storefront), consistent with standard events.
- Use **PKR** (or your configured code) in catalog and ad account alignment.

### 5. AEM / iOS / prioritization

- If you use **Aggregated Event Measurement**, **prioritize** events in order of business importance (e.g. `Purchase` / `NS_EV_PRCHS_SUCCESS` first, then `InitiateCheckout` / `NS_EV_INTCHECKOUT`, then upper funnel).

### 6. Catalog & `content_ids`

- **Standard** events use **Advertising ID** when set — align with **Meta catalog** `id` / ` retailer_id` as you configured in admin.
- **Custom NS events** may include **UUID** when Advertising ID is missing; catalog-based dynamic ads still rely on the **standard** event `content_ids` where possible.

---

## Environment variables

| Variable | Role |
|----------|------|
| `NEXT_PUBLIC_META_PIXEL_ID` | Pixel ID in the browser |
| `META_PIXEL_ID` + `META_CONVERSIONS_ACCESS_TOKEN` | CAPI on server |
| `NEXT_PUBLIC_META_TEST_EVENT_CODE` / `META_TEST_EVENT_CODE` | Optional test stream (server ignores `META_TEST_EVENT_CODE` in production unless `META_ALLOW_TEST_EVENT_IN_PRODUCTION=true`) |
| `META_ALLOW_TEST_EVENT_IN_PRODUCTION` | Set `true` only if you must send `test_event_code` in production |

---

### Admin: fake purchase signal to Meta

- **Endpoint:** `POST /api/v1/admin/orders/:orderId/meta-notify-fake-purchase` (JWT **admin** only, not staff).
- Sends **server CAPI** custom event **`NS_EV_ORDER_VOID`** once per order (`metaVoidSentAt` on `orders`): hashed **email** / **phone** when available, **`custom_data.order_id`**, **`value`** (order total in major units), **`currency`**, **`event_id`** `ns_void_{orderId}`. **`campaign_id`**, **`adset_id`**, **`ad_id`** are added to `custom_data` when the latest **`purchase`** analytics event for that `orderId` has Meta URL attribution (same as storefront integration).
- Does **not** remove or edit the original **Purchase** in Meta; use for custom conversions / audiences / reporting. Create a custom conversion on **`NS_EV_ORDER_VOID`** in Events Manager if needed.

---

## Change log

Update this doc when you add or rename events in `lib/analytics.js` or change CAPI mapping in `meta-conversions.service.ts`.
