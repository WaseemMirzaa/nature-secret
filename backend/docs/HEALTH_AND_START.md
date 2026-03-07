# Backend start and health

**Build:** `npm run build`  
**Start:** `npm start` (runs `run-with-restart.js` → `node dist/main.js`)

**Health check (no auth):**
```bash
curl -s https://shafaefitrat.com/health
```
Response: `{"ok":true,"ts":1234567890}`. Use this URL in Hostinger for health checks so the proxy gets 200 quickly.
