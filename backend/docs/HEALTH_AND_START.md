# Backend start and health

**Build:** `npm run build`  
**Start:** `npm start` (runs `run-with-restart.js` → `node dist/main.js`)

**Health check (no auth).** Try both; use whichever your proxy forwards:
```bash
curl -s https://shafaefitrat.com/health
curl -s https://shafaefitrat.com/api/v1/health
```
Response: `{"ok":true,"ts":1234567890}`. If only one works, your proxy likely forwards only `/api/v1` – then use `/api/v1/health`.
