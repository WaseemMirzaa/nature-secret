# Production deployment checklist

- **Backend (.env):** Set `NODE_ENV=production`, strong `JWT_SECRET` and `ENCRYPTION_KEY` (32+ chars), real MySQL credentials, `FRONTEND_ORIGIN` to your frontend URL.
- **Frontend:** Set `NEXT_PUBLIC_API_URL` to your API base URL (e.g. `https://api.yourdomain.com`). Set `NEXT_PUBLIC_SITE_URL` to the site URL (e.g. `https://naturesecret.pk`) if you use assetPrefix.
- **Frontend static (fix 404 for CSS/chunks):** Run `npm run build` then `npm start` (standalone). Proxy **all** requests to the Node app (including `/_next/static/*` and `/`). Do not serve static from a different docroot than the one that serves the HTML.
- **MySQL:** Use a managed MySQL or create DB on host; run backend once so TypeORM creates tables (or use migrations); run `npm run seed:admin` in backend to create admin users.
- **CORS:** Ensure `FRONTEND_ORIGIN` matches the exact origin of the Next.js app.
- **WebSocket:** Ensure your reverse proxy (nginx/caddy) forwards `/api/v1/ws` (Socket.IO path) to the NestJS server so admin realtime and new-order notifications work.
- **Process manager:** Use PM2 or systemd for API and (if SSR) Next.js so they restart on failure.
