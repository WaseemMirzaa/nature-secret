# First-time admin seed

If no admin exists in the DB (e.g. startup seed failed), create one via:

1. Set `SETUP_SECRET` in your backend `.env` (e.g. a random string).
2. Run:

```bash
curl -X POST https://shifaefitrat.com/api/v1/setup/seed-admin \
  -H "X-Setup-Secret: YOUR_SETUP_SECRET"
```

For local:

```bash
curl -X POST http://localhost:4000/api/v1/setup/seed-admin \
  -H "X-Setup-Secret: YOUR_SETUP_SECRET"
```

Response: `{"ok":true,"created":1}` (or `created:2`). Then log in with `admin@naturesecret.com` / `Admin123!`.

---

# Seed categories (and hero slides) if empty

If `GET /api/v1/categories` returns `[]`, seed default categories and slides:

```bash
curl -X POST https://shafaefitrat.com/api/v1/setup/seed-categories \
  -H "X-Setup-Secret: YOUR_SETUP_SECRET"
```

Response: `{"ok":true,"categoriesCreated":2,"slidesCreated":3}`. Then `GET /api/v1/categories` will return Skin care and Herbal oil.
