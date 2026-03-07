# Web app not working – checklist

## 1. Frontend (naturesecret.pk) shows 503 / blank / "temporarily busy"

- **Build:** On Hostinger, the frontend app must run **Build command:** `npm run build`. If build fails or is skipped, `npm start` will exit with "Standalone server not found".
- **Start command:** Must be `npm start` (runs `node run-with-restart.js`, which runs the standalone server).
- **Logs:** In Hostinger → your frontend app → Logs. Look for "Standalone server not found" or Node errors. If you see "Too many restarts", the app is crashing repeatedly.

## 2. API calls 404 (products, categories, login)

- **Backend URL:** The app uses `https://shifaefitrat.com` when the site is opened from naturesecret.pk (see `lib/api.js` → `BACKEND_DOMAIN`). If your API is on another domain, change `BACKEND_DOMAIN` in `lib/api.js` or set **NEXT_PUBLIC_API_URL** in the frontend env and rebuild.
- **Backend up:** Open `https://shifaefitrat.com/health` and `https://shifaefitrat.com/api/v1/products?limit=1` in the browser. If you get 404/503, the backend is down or not deployed correctly.

## 3. API calls CORS / blocked

- On the **backend** (Hostinger), set **FRONTEND_ORIGIN** = `https://naturesecret.pk,https://www.naturesecret.pk` so the API allows requests from the frontend.

## 4. Backend (shifaefitrat.com) 503 or not starting

- **Build:** Backend must run `npm run build` (or Hostinger’s build step).
- **Start:** Backend start command should be `npm start` (uses `run-with-restart.js`).
- **Env:** Set at least: `MYSQL_*`, `JWT_SECRET`, `PORT` (if needed), `FRONTEND_ORIGIN`. See `docs/ENV_VARIABLES.md`.
- **Logs:** Check backend app logs for DB connection errors or "Schema sync failed".

## 5. Quick checks

| Check | Frontend | Backend |
|-------|----------|---------|
| Build | `npm run build` → `.next/standalone/server.js` exists | `npm run build` → `dist/main.js` exists |
| Start | `npm start` | `npm start` |
| Env | `NEXT_PUBLIC_API_URL` optional (naturesecret.pk fallback in code) | `MYSQL_*`, `JWT_SECRET`, `FRONTEND_ORIGIN` |
