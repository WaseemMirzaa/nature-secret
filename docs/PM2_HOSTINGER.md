# PM2 setup on Hostinger

## 1. Install PM2 (on the server)

```bash
npm install -g pm2
```

If you don’t have global install rights, use:

```bash
npm install pm2
# run with: npx pm2 start ecosystem.config.cjs
```

## 2. Build before first run

**Backend (API):**
```bash
cd /path/to/repo/backend
npm ci
npm run build
```

**Frontend (if you run it with PM2 on same server):**
```bash
cd /path/to/repo
npm ci
npm run build
```

## 3. Start with PM2

From the **repo root**:

```bash
cd /path/to/repo

# Run only API (e.g. on shifaefitrat.com)
pm2 start ecosystem.config.cjs --only nature-secret-api

# Or only frontend (e.g. on naturesecret.pk)
pm2 start ecosystem.config.cjs --only nature-secret-web

# Or both (if frontend + API on same server)
pm2 start ecosystem.config.cjs
```

## 4. Env and ports

Set env on the server (e.g. in Hostinger’s Node.js app settings or in a `.env` file in the right folder):

- **API:** `PORT` (default 4000), `DATABASE_URL`, `JWT_SECRET`, etc.
- **Web:** `PORT` for Next (default 3000) is overridden by `-p` in the ecosystem file; set `WEB_PORT` if you need another port.

Then restart:

```bash
pm2 restart nature-secret-api
# or
pm2 restart nature-secret-web
```

## 5. Useful PM2 commands

```bash
pm2 list
pm2 logs
pm2 logs nature-secret-api
pm2 restart nature-secret-api
pm2 stop nature-secret-api
pm2 delete nature-secret-api
```

## 6. Start on server reboot (optional)

```bash
pm2 startup
pm2 save
```

(Run the command `pm2 startup` prints if it asks you to.)

## 7. Hostinger notes

- **Node.js app:** In the panel you often choose “Run script” (e.g. `server.js` or `node dist/main.js`). To use PM2 instead, run PM2 from SSH and point the app to the same port, or turn off the panel’s auto-start and use only PM2.
- **Paths:** Replace `/path/to/repo` with the real path (e.g. `~/domains/naturesecret.pk/public_html` or the path Hostinger gives).
- **One app per domain:** Use `--only nature-secret-api` on the API server and `--only nature-secret-web` on the frontend server so each machine runs one process.
