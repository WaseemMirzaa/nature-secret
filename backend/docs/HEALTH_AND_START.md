# Backend start and health

**Build:** `npm run build`  
**Start:** `npm start` (runs `run-with-restart.js` → `node dist/main.js`)

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
- **Start command:** `npm start` or `node run-with-restart.js`. Alternative (no auto-restart): `node server.js` – [server.js](../server.js) checks `dist/main.js` exists then runs it; use if the host expects a single entry file.

If the server does not start, check runtime logs for:
- `[run-with-restart] dist/main.js not found. Run: npm run build` → build step did not run or failed; fix Build command and redeploy.
- `Schema sync failed` → DB env vars (`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`) missing or wrong.
