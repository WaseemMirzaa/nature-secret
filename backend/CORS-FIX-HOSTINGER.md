# Fix CORS: "Access-Control-Allow-Origin has value ... azure-goldfish ..."

The response is coming from **Hostinger's env or proxy**, not from the app. Do this:

## On Hostinger (backend app for shifaefitrat.com)

1. Open your **Node.js application** in the panel.
2. Go to **Environment variables** (or **Settings** → **Env**).
3. Find **FRONTEND_ORIGIN**.
4. Set it to:
   ```
   https://naturesecret.pk
   ```
   (Replace any value like `https://azure-goldfish-614674.hostingersite.com`.)
5. **Save** and **restart** the Node app (or trigger a new deploy).

After this, the CORS header should be `https://naturesecret.pk` and the browser will allow requests from naturesecret.pk.

---

If you want both naturesecret.pk and the Hostinger URL allowed, set:
```
FRONTEND_ORIGIN=https://naturesecret.pk,https://azure-goldfish-614674.hostingersite.com
```
(Our app code supports comma-separated; the proxy may use only the first value.)
