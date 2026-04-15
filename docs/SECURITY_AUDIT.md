# Security notes (Nature Secret)

## Fixed in code (this repo)

| Issue | Mitigation |
|--------|------------|
| **Stored XSS (blog)** | `post.body` rendered with `sanitizeBlogHtml()` (DOMPurify). |
| **Checkout price tampering** | `POST /orders` recomputes line `price` and order `total` from DB; client values ignored. Stock checked vs `inventory` / `outOfStock`. |
| **WebSocket admin leak** | Socket.IO only joins `admin` room after valid **admin/staff** JWT (`auth.token` or `Authorization: Bearer`). Customer tokens disconnected. |

## Remaining risks / hardening (ops & config)

1. **`JWT_SECRET`** — Never use the code fallback in production; set a long random secret in env.
2. **`SETUP_SECRET`** — Required for `/api/v1/setup/*`; disable or rotate after bootstrap; do not expose publicly.
3. **Public `GET /admin/products/upload/:filename`** — Intentionally unauthenticated image delivery; filenames are UUID/slug-based (low enumeration risk).
4. **Global throttle** — `100 req/min` per default Throttler; tune per route if abused.
5. **Dependencies** — Run `npm audit` on root and `backend/`; `xlsx` has known advisories if used server-side with untrusted files.
6. **MySQL credentials** — Defaults in `app.module.ts` are dev-only; production must use strong env vars.
7. **CORS** — `allowOrigin` allows origins containing `naturesecret.pk`; keep `FRONTEND_ORIGIN` accurate.

## Not a code “loophole”

- **Meta Pixel / CAPI** — Configured in Meta Business Manager; broken partner URLs are not in this repo.
