# Environment variables

## Frontend (Next.js)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | No | Backend API base URL (e.g. `https://shifaefitrat.com`). Default: `http://localhost:4000`. Build-time; used for API calls. |
| `NEXT_PUBLIC_SITE_URL` | No | Full site URL for asset loading (e.g. `https://naturesecret.pk`). Used if you set `assetPrefix`. |
| `NEXT_PUBLIC_META_PIXEL_ID` | No | Meta/Facebook Pixel ID for analytics (see `lib/meta-pixel.js`). |

**File:** `.env.local` (copy from `.env.local.example`).

---

## Backend (NestJS)

### Required

| Variable | Description |
|----------|-------------|
| `MYSQL_HOST` | MySQL host (e.g. `localhost` or Hostinger DB host). |
| `MYSQL_PORT` | MySQL port (default `3306`). |
| `MYSQL_USER` | MySQL user. |
| `MYSQL_PASSWORD` | MySQL password. |
| `MYSQL_DATABASE` | MySQL database name. |

### Auth & API

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret for JWT signing. Use a long random value in production. |
| `PORT` | Server port (default `4000`). |
| `FRONTEND_ORIGIN` | Allowed CORS origin(s), comma-separated (e.g. `https://naturesecret.pk,https://www.naturesecret.pk`). |
| `API_PUBLIC_URL` | Public base URL of this API (e.g. `https://shifaefitrat.com`). Used in upload/image URLs. |
| `UPLOAD_ROOT` | **Persistent uploads:** absolute path to a directory outside the app (e.g. `/var/data/nature-secret`). Product, blog, and slider images are stored under this path so they are not deleted on server update/redeploy. If unset, uploads go under the app directory. |

### Optional / security

| Variable | Description |
|----------|-------------|
| `ENCRYPTION_KEY` | 32+ char key for encryption util. |
| `ENCRYPTION_SALT` | Salt for encryption (default in code). |
| `SETUP_SECRET` | Secret for `POST /api/v1/setup/seed-admin` (header `X-Setup-Secret`). |
| `WEBHOOK_SECRET` or `WHATSAPP_WEBHOOK_SECRET` | Secret for WhatsApp webhook auth. |
| `NODE_ENV` | `production` or `staging` (scripts set this). |

### Email (Gmail)

| Variable | Description |
|----------|-------------|
| `GMAIL_USER` | Gmail address for sending. |
| `GMAIL_APP_PASSWORD` or `GMAIL_PASS` | Gmail app password (use App Password if 2FA enabled). |

### Twilio (WhatsApp)

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID. |
| `TWILIO_AUTH_TOKEN` | Twilio auth token. |
| `TWILIO_WHATSAPP_FROM` | WhatsApp sender (e.g. `whatsapp:+14155238886`). |

**File:** `backend/.env` (copy from `backend/.env.example`).
