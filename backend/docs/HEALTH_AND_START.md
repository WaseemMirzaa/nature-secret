# Backend start and health

**Build:** `npm run build` (output: `dist/main.js`).  
**Start:** `npm start` (runs `node dist/main.js`). For hosts that want a single entry file, use `server.js` (it runs `dist/main.js`). **Do not** set Entry File to `main.ts` — that is source; Node runs the compiled `dist/main.js` (or `server.js` which launches it).

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

- **Node version:** Use **Node 20** (LTS). The backend `package.json` specifies `engines.node >=18 <23`. Prefer Node 20 for security updates.
- **Application root:** Backend folder (contains `package.json`, `server.js`, `dist/` after build).
- **Build command:** `npm install && npm run build` (produces `dist/main.js`).
- **Entry file:** If the host **requires** a value and won’t accept empty: use **`dist/main.js`** (the built app). If the host allows a custom start script, use **`run-with-restart.js`** or **`server.js`** for restart-on-crash.
- **Output directory:** Set to **`dist`** (required by many hosts so they know where the build output is).
- **Start command:** If you have this field, set it to **`node run-with-restart.js`** or **`npm start`**. If the host runs the Entry file automatically, leave Start command empty when Entry file is `dist/main.js`. **Do not use `main.ts`** — Node runs the compiled JS.

**Keeping the server alive when it crashes (Hostinger)**

1. **Run with in-process restart (simplest)**  
   Set Start command to: `node run-with-restart.js`  
   The wrapper runs `dist/main.js` and restarts it after a crash (3s delay, no restart limit). No cron or PM2 needed. Works within Hostinger’s single-process Node app.

2. **Cron: health check + restart**  
   If the process dies, a cron job can restart it when `/health` fails. The script starts the app with `node run-with-restart.js` (so it also restarts on crash). In Hostinger (or your host) add a cron job:  
   `*/5 * * * * cd /path/to/backend && ./scripts/check-and-restart.sh >> /tmp/backend-cron.log 2>&1`  
   Replace `/path/to/backend` with the real backend directory (e.g. `/home/u493740372/domains/shifaefitrat.com/nodejs` or the path shown in your Node app). Run: `npm run cron:restart-if-down` from the backend folder, or call the script directly as above. Ensure the script is executable: `chmod +x scripts/check-and-restart.sh`.

3. **PM2 (if you have SSH and can install it)**  
   Install PM2, then start the API with: `pm2 start ecosystem.config.cjs --only nature-secret-api`. PM2 restarts the process on crash. Use `pm2 startup` and `pm2 save` so it survives reboots. See [docs/PM2_HOSTINGER.md](../../docs/PM2_HOSTINGER.md) in the repo root.

4. **Hostinger “Restart on failure”**  
   If the Node.js app in the panel has an option like “Restart application on failure” or “Auto-restart”, enable it so the host restarts the app when it exits.

5. **systemd (VPS with root)**  
   If you have a VPS and SSH, you can add a systemd unit that runs `node dist/main.js` (or `run-with-restart.js`) with `Restart=on-failure`. Then the OS keeps it alive and restarts on crash/reboot.

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
