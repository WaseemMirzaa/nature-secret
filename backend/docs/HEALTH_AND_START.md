# Backend start and health

**Build:** `npm run build`  
**Start:** `npm start` (runs `node server.js` → `dist/main.js`). Optional auto-restart: cron runs `scripts/check-and-restart.sh` (e.g. every 5 min) to restart if `/health` is down.

**DB structure + seeding (admin, categories, hero slides):**
- **Local / with ts-node:** `npm run db:setup` — runs TypeORM `synchronize` (updates tables/columns to match entities) then seeds admin users, categories, and hero slides.
- **After build (e.g. Hostinger):** `npm run db:setup:prod` — runs `node dist/db-sync-and-seed.js` (no ts-node). Run once after deploy if you need a fresh schema or seed (e.g. empty DB).
- **Scripts in package.json:** `db:setup`, `db:setup:prod`, `db:sync-seed`, `seed`, `seeds` all point to this flow. Legacy: `seed:admin`, `seed:admin-categories` (plain Node, no schema update).

**Health check (no auth).** Try both; use whichever your proxy forwards:
```bash
curl -s https://shafaefitrat.com/health
curl -s https://shafaefitrat.com/api/v1/health
```
Response: `{"ok":true,"ts":1234567890}`. If only one works, your proxy likely forwards only `/api/v1` – then use `/api/v1/health`.

---

# Hostinger

- **Application root:** Must be the backend repo root (the folder that contains `package.json` and `run-with-restart.js`).
- **Build command:** `npm install && npm run build` (so `dist/main.js` exists before start).
- **Start command:** `npm start` (runs `node server.js`). To restart if down, add a cron job: `*/5 * * * * cd /path/to/backend && npm run cron:restart-if-down >> /tmp/backend-cron.log 2>&1`. Optional: `node run-with-restart.js` for in-process restart on crash.

**APIs not working / no logs (including health)**
- Start with `npm start` from the **backend** folder (so `node dist/main.js` runs). You should see in order: `[API] ... Bootstrap started` → `[API] ... Nest app created` → `[API] ... Listening on http://0.0.0.0:4000` → `Database schema synced` or `Schema sync failed`. If you see **none** of these, the Node process is not running or stdout is not captured (check Hostinger “Start command” is `npm start` and “Application root” is the backend directory; check “Logs” or “Runtime logs” in the panel).
- Each health hit logs `[API] ... Health check GET /health` or `... Health check GET /api/v1/health`. If you see “Listening” but no “Health check” when you curl or open the health URL, the request is not reaching this Node app (wrong port, proxy not forwarding, or proxy answering itself).
- Set DB env vars: `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`; missing/wrong values can cause exit after “Bootstrap started” with “Failed to create app”.

If the server does not start, check runtime logs for:
- `[run-with-restart] dist/main.js not found. Run: npm run build` → build step did not run or failed; fix Build command and redeploy.
- `[API] Bootstrap failed` or `Failed to create app` → DB env vars (`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`) missing or wrong.
- `Schema sync failed` → same DB env vars or DB server unreachable.

**Persistent uploads (images not deleted on deploy)**  
Set `UPLOAD_ROOT` to a path that Hostinger does **not** overwrite when you redeploy.

Example for **shifaefitrat.com** (home: `u493740372`):

1. In File Manager go to `domains/shifaefitrat.com` (same level as your Node app folder, not inside it).
2. Create a folder named `uploads` there.
3. In the Node app’s **Environment variables** add:
   ```bash
   UPLOAD_ROOT=/home/u493740372/domains/shifaefitrat.com/uploads
   ```
4. Restart the app. Product, blog, and slider images will be stored in that folder and will survive redeploys.

If your domain path is different, use the path you see in File Manager (e.g. `/home/u493740372/domains/shifaefitrat.com/uploads`). Do **not** put `uploads` inside the application root (e.g. not inside `public_node`), or it may be removed on deploy.

**No products in DB after adding in admin**  
- Backend does **not** drop or clear the `products` table. Seed only touches admin_users, categories, hero_slides.
- In Hostinger **runtime logs**, after you click “Add product” in the admin panel, look for:
  - `Product create requested: name=... slug=...` → request reached the backend.
  - `Product saved to DB id=...` → row was inserted.
- If you **never** see those lines: the create request is not reaching this backend (wrong API URL or 401). Set the frontend’s API base to this backend (e.g. `NEXT_PUBLIC_API_URL` or meta `api-url` = `https://shifaefitrat.com`), and log in again in the admin panel.
- If you **do** see those lines but the DB has no rows: confirm you’re checking the same database as in this app’s env (`MYSQL_DATABASE`, `MYSQL_HOST`, etc.).
