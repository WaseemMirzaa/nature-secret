# Fix 404 on admin login / products (naturesecret.pk)

If you see `GET https://naturesecret.pk/api/v1/products 404` or login 404, the frontend was calling the frontend domain instead of the backend.

**Code fix:** When the site is loaded from `naturesecret.pk` or `www.naturesecret.pk`, the app now defaults the API base to `https://shifaefitrat.com` (see `lib/api.js` → `BACKEND_DOMAIN`). Redeploy the frontend for this to take effect.

**Optional:** To use a different backend URL, set **NEXT_PUBLIC_API_URL** in the frontend app’s env (e.g. `https://your-api.com`) and rebuild.
