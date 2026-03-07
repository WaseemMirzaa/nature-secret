# Fix 404 on admin login (naturesecret.pk)

If you see `POST https://naturesecret.pk/api/v1/auth/admin/login 404`, the frontend is calling the **frontend** domain instead of the **backend**.

**Fix:** In Hostinger, for the **frontend** app (naturesecret.pk):

1. Open **Environment variables** (or **Settings** → **Env**).
2. Add or set: **NEXT_PUBLIC_API_URL** = your backend URL, e.g. `https://shifaefitrat.com` (no trailing slash).
3. **Redeploy / rebuild** the frontend so the new value is baked in.

After that, login will call the correct API and work.
