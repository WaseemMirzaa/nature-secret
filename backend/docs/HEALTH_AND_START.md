# Backend start and health

**Build:** `npm run build`  
**Start:** `npm start` (runs `node server.js` → `dist/main.js`). Optional auto-restart: cron runs `scripts/check-and-restart.sh` (e.g. every 5 min) to restart if `/health` is down.

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

If the server does not start, check runtime logs for:
- `[run-with-restart] dist/main.js not found. Run: npm run build` → build step did not run or failed; fix Build command and redeploy.
- `Schema sync failed` → DB env vars (`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`) missing or wrong.

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
