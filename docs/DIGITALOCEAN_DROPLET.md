# Deploy Nature Secret on a DigitalOcean Droplet

This guide covers a single Ubuntu droplet running the **backend API** and **Next.js frontend** behind Nginx, with MySQL and PM2. It uses the **droplet IP only** (no domain); you can add a domain and SSL later.

---

## 1. Create the droplet

- **Image:** Ubuntu 22.04 LTS  
- **Size:** Basic, 1 GB RAM minimum (2 GB recommended for both app + MySQL)  
- **Region:** Choose nearest to your users  
- Add your SSH key and create the droplet.  
- SSH in: `ssh root@<droplet-ip>`

---

## 2. Install Node.js, MySQL, Nginx, Git

```bash
apt update && apt upgrade -y
apt install -y curl git nginx mysql-server

# Node 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PM2
npm install -g pm2
```

---

## 3. MySQL: create database and user

```bash
mysql -u root -p
```

In MySQL (run in this order — create user first, then grant):

```sql
CREATE DATABASE nature_secret CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nature_secret'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON nature_secret.* TO 'nature_secret'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Change password later:** `ALTER USER 'nature_secret'@'localhost' IDENTIFIED BY 'NEW_PASSWORD';` then `FLUSH PRIVILEGES;` — and update `MYSQL_PASSWORD` in backend `.env`.

If you get **"You are not allowed to create a user with GRANT"**: your MySQL version requires `CREATE USER` first (as above). Run `CREATE USER` and `GRANT` as two separate statements. If the user already exists, run only: `GRANT ALL PRIVILEGES ON nature_secret.* TO 'nature_secret'@'localhost'; FLUSH PRIVILEGES;`

---

## 4. Clone the app and build

**Is `/var/www` safe for the backend, `.env`, and the database?** Yes.
- **`.env`** – It lives only on disk in `backend/.env`. Nginx proxies to the Node process; it never serves files from this directory, so `.env` is never sent over HTTP. Only the Node process (and users with server SSH access) can read it.
- **Database** – MySQL listens on `127.0.0.1:3306` (localhost only). The firewall (UFW) allows SSH and Nginx only, not port 3306, so the DB is not reachable from the internet. Only the backend on the same server can connect.
- **Code** – Same as `.env`: no `root` to this folder in Nginx, so nothing under `/var/www/nature-secret` is served as static files. If you prefer, use another path (e.g. `/opt/nature-secret`) and update paths in this guide.

```bash
cd /var/www
git clone https://github.com/WaseemMirzaa/nature-secret.git
cd nature-secret
```

(Or use your repo URL and branch.)

**Backend**

```bash
cd /var/www/nature-secret/backend
npm ci
cp .env.example .env   # if you have one; otherwise create .env (see below)
npm run build
node dist/db-sync-and-seed.js
```

**Frontend**

```bash
cd /var/www/nature-secret
npm ci
cp .env.local.example .env.local   # if exists, else create (see below)
npm run build
```

---

## 5. Environment variables

**Backend** (`/var/www/nature-secret/backend/.env`)

```bash
NODE_ENV=production
PORT=4000

# MySQL (must match step 3)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=nature_secret
MYSQL_PASSWORD=NsEnc7kL2mP9xQ4vW8rT1yUA5cB0dF1ads1123
MYSQL_DATABASE=nature_secret

# JWT (generate a long random string)
JWT_SECRET=NsJwt9kL2mP7xQ4vW8rT1yU6eR3zA5cB0dF2gH4jK6nM

# Frontend URL (for CORS and emails). Replace with your droplet IP; use http until you add SSL.
FRONTEND_ORIGIN=http://165.232.123.45

# Public API URL (for image URLs in API responses). Same as above when using one IP.
API_PUBLIC_URL=http://165.232.123.45

# Uploads (persist across deploys)
UPLOAD_ROOT=/var/www/nature-secret-uploads

# Encryption (for sensitive data at rest). Generate once and keep secret.
# Run: openssl rand -base64 32 (for key) and openssl rand -base64 32 (for salt)
ENCRYPTION_KEY=your-32-char-or-longer-secret-key-change-in-production
ENCRYPTION_SALT=your-32-char-or-longer-salt-change-in-production
```

Generate random encryption key and salt (run once, then paste into `.env`):
```bash
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)"
echo "ENCRYPTION_SALT=$(openssl rand -base64 32)"
```

Create uploads dir and ensure backend assets exist:
```bash
mkdir -p /var/www/nature-secret-uploads /var/www/nature-secret/backend/public/assets
chown -R www-data:www-data /var/www/nature-secret-uploads   # or the user that runs PM2
```
The backend serves static files from `backend/public/assets` at the `/assets` path (e.g. logos). The repo includes `backend/public/assets`; add any extra static files there. The build copies `public/` into `dist/`; at runtime the backend reads from `backend/public/assets`.

Optional: `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `TWILIO_*`, `SETUP_SECRET`, `WEBHOOK_SECRET` — see backend code/docs if you use email, WhatsApp, or setup endpoints.

**Frontend** (`/var/www/nature-secret/.env.local`)

```bash
# Replace with your droplet IP. Use http until you add a domain and SSL. Do not add :4000 — Nginx listens on 80 and proxies /api to the backend.
NEXT_PUBLIC_API_URL=http://YOUR_DROPLET_IP
```

Example: if your droplet IPv4 is `165.232.123.45`, use `http://165.232.123.45` (no trailing slash, **no port**). The browser will call `http://165.232.123.45/api/v1/...` on port 80; Nginx proxies that to the backend on :4000. Use **IPv4** in env; if you use IPv6, put it in brackets: `http://[2604:a880::1]`.

---

## 6. Start apps with PM2

From repo root:

```bash
cd /var/www/nature-secret
pm2 start ecosystem.config.cjs
```

Or start only one app:

```bash
pm2 start ecosystem.config.cjs --only nature-secret-api
pm2 start ecosystem.config.cjs --only nature-secret-web
```

Make PM2 start on reboot:

```bash
pm2 startup
# run the command it prints (e.g. sudo env PATH=... pm2 startup systemd -u www-data --hp /var/www)
pm2 save
```

Default ports: API **4000**, frontend **3000**. Change with `API_PORT` / `WEB_PORT` in the ecosystem file or env if needed.

---

## 7. Nginx: reverse proxy (no domain — droplet IP only)

One server block: frontend at `/`, API at `/api`, assets at `/assets`. Use your **droplet IP** in the browser (e.g. `http://165.232.123.45`). No SSL until you add a domain later.

**Nginx** (`/etc/nginx/sites-available/nature-secret`)

```nginx
server {
    listen 80 default_server;
    server_name _;
    client_max_body_size 20M;

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    location /assets/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and test:

```bash
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/nature-secret /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Open **`http://YOUR_DROPLET_IP`** in the browser (e.g. `http://165.232.123.45`). Frontend loads from `/`, API from `/api/v1/...`, assets from `/assets/`.

**If you get 404 Not Found (nginx):**

1. **Apps must be running.** Nginx only proxies; it doesn’t serve the app. Run:
   ```bash
   cd /var/www/nature-secret && pm2 list
   ```
   You should see `nature-secret-api` and `nature-secret-web` **online**. If not: `pm2 start ecosystem.config.cjs` then `pm2 save`.

2. **Use the correct Nginx config and make it default.** Run:
   ```bash
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo ln -sf /etc/nginx/sites-available/nature-secret /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

3. **Confirm the config file exists:**
   ```bash
   sudo cat /etc/nginx/sites-available/nature-secret
   ```
   It should contain the `server { listen 80 default_server; ... }` block with `location /api/`, `location /assets/`, and `location /`. If the file is missing, create it with the contents from section 7 above.

4. **Test backends locally:** `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/` should be 200 or 304; `curl -s http://127.0.0.1:4000/api/v1/health` should return JSON. If 3000 or 4000 don’t respond, fix PM2 first.

---

## 7b. When you add a domain and SSL later

After you point a domain to the droplet IP, you can:

1. **Nginx:** Change `server_name _;` to `server_name yourdomain.com www.yourdomain.com;` and reload Nginx.
2. **Env:** Update `FRONTEND_ORIGIN`, `API_PUBLIC_URL`, and `NEXT_PUBLIC_API_URL` to `https://yourdomain.com`, rebuild frontend (`npm run build`), restart PM2.
3. **SSL:** Use **Let's Encrypt** and/or **Cloudflare** as below.

**Let's Encrypt (origin certificate)**

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Cloudflare in front**

- DNS: A record for your domain → droplet IP, **Proxied** (orange cloud).
- SSL/TLS: **Flexible** (no cert on droplet) or **Full (strict)** with Let's Encrypt on the droplet. Cloudflare sends `X-Forwarded-Proto`; Nginx already forwards it to the apps.

---

### Optional: Two domains (subdomain for API)

When you have a domain, traffic flows like this (the right side is always `127.0.0.1` on the server — Nginx proxies to localhost):

- **Frontend:** `https://yourdomain.com` (or `http://YOUR_DROPLET_IP` when no domain) → `http://127.0.0.1:3000`  
- **API:** `https://api.yourdomain.com` (or same IP with path `/api` when no domain) → `http://127.0.0.1:4000`  

Create two server blocks (only when using two domains).

**Frontend** (`/etc/nginx/sites-available/nature-secret-frontend`)

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**API** (`/etc/nginx/sites-available/nature-secret-api`)

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    client_max_body_size 20M;
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
```

Enable and test (only if you use two domains):

```bash
ln -s /etc/nginx/sites-available/nature-secret-frontend /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/nature-secret-api /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## 8. Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

---

## 9. Checklist

| Item | Notes |
|------|--------|
| Droplet | Ubuntu 22.04, 1–2 GB RAM |
| Node.js | v20 (LTS) |
| MySQL | DB + user created, credentials in backend `.env` |
| Backend `.env` | `MYSQL_*`, `JWT_SECRET`, `FRONTEND_ORIGIN`, `API_PUBLIC_URL` = `http://DROPLET_IP`, `UPLOAD_ROOT` |
| Frontend `.env.local` | `NEXT_PUBLIC_API_URL` = `http://DROPLET_IP` |
| Build | `npm run build` in backend and in repo root (frontend) |
| Seed | `node backend/dist/db-sync-and-seed.js` once |
| PM2 | `pm2 start ecosystem.config.cjs`, then `pm2 startup` + `pm2 save` |
| Nginx | One server block (section 7): `/` → :3000, `/api/` and `/assets/` → :4000 |
| UFW | Allow SSH and Nginx |
| SSL | Add later when you have a domain (section 7b) |

**Admin login (seeded by backend)**

After the seed runs (on first start or `node dist/db-sync-and-seed.js`), you can sign in at **`http://YOUR_DROPLET_IP/admin/login`** with:

| Role  | Email                     | Password   |
|-------|----------------------------|------------|
| Admin | `admin@naturesecret.com`   | `Admin123!` |
| Staff | `staff@naturesecret.com`  | `Staff123!` |

Change these passwords after first login (or edit the seed in `backend/src/seed-on-startup.ts` and re-run seed if the DB is empty).

**Test API endpoints (when login is not working)**

Replace `YOUR_DROPLET_IP` with your server IP (e.g. `165.232.123.45`). Base URL: `http://YOUR_DROPLET_IP/api/v1`.

| Purpose        | Method | URL |
|----------------|--------|-----|
| Health         | GET    | `http://YOUR_DROPLET_IP/api/v1/health` |
| Admin login    | POST   | `http://YOUR_DROPLET_IP/api/v1/auth/admin/login` |
| Customer login | POST   | `http://YOUR_DROPLET_IP/api/v1/auth/customer/login` |
| Categories     | GET    | `http://YOUR_DROPLET_IP/api/v1/categories` |
| Products       | GET    | `http://YOUR_DROPLET_IP/api/v1/products` |
| Slider         | GET    | `http://YOUR_DROPLET_IP/api/v1/slider` |
| Blog posts     | GET    | `http://YOUR_DROPLET_IP/api/v1/blog/posts` |

**Example: health (no body)**
```bash
curl -s http://YOUR_DROPLET_IP/api/v1/health
```
Expected: `{"ok":true,"ts":...}`

**Example: admin login (returns token)**
```bash
curl -s -X POST http://YOUR_DROPLET_IP/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@naturesecret.com","password":"Admin123!"}'
```
Expected: JSON with `access_token` and `user`. If you get 401, the email/password are wrong or the admin user was not seeded.

**Example: customer login**
```bash
curl -s -X POST http://YOUR_DROPLET_IP/api/v1/auth/customer/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@example.com","password":"yourpassword"}'
```

If health works but login returns 401, check that the seed ran (`pm2 logs` for "Seeded admin") and use the credentials from the table above. If health fails or connection refused, the API process or Nginx proxy is not running.

**"CORS / more-private address space loopback" when logging in**

If the browser shows: *Access to fetch at 'http://localhost:4000/...' from origin 'http://YOUR_IP:3000' has been blocked by CORS policy... resource is in more-private address space `loopback`*, the frontend is still calling `localhost:4000` instead of the droplet. Fix: on the droplet set `NEXT_PUBLIC_API_URL=http://YOUR_DROPLET_IP` in `/var/www/nature-secret/.env.local` (e.g. `http://64.23.180.126`, no port), then **rebuild** the frontend (`npm run build`) and restart (`pm2 restart nature-secret-web`). Next.js bakes `NEXT_PUBLIC_*` at build time.

**"GET /api/v1/admin/* 401 (Unauthorized)"**

1. **Nginx must forward the token:** In `location /api/` add `proxy_set_header Authorization $http_authorization;` (see section 7), then `sudo nginx -t && sudo systemctl reload nginx`.
2. **Use a real login token:** In the browser, open DevTools → Application → Local Storage. If `nature_secret_admin` has no `access_token`, run `localStorage.removeItem('nature_secret_admin'); location.href='/admin/login';` then sign in with `admin@naturesecret.com` / `Admin123!` so the API returns and stores a token.
3. **Backend:** Same `JWT_SECRET` in backend `.env` as when the token was issued; admin user must exist (re-run seed if needed: `cd backend && node dist/db-sync-and-seed.js`).

**"WebSocket connection to .../api/v1/ws/ failed"**

1. In `location /api/` you must have `proxy_set_header Upgrade $http_upgrade;` and `proxy_set_header Connection "upgrade";` (section 7). Reload Nginx.
2. Backend and Socket.IO must be running (`pm2 list` → `nature-secret-api` online).

**"Script not found: .../node_modules/.bin/next"**

The ecosystem file was updated to use `./node_modules/next/dist/bin/next` instead of `.bin/next`. On the droplet run: `git pull` (or copy the latest `ecosystem.config.cjs`), then `pm2 delete nature-secret-web`, then `pm2 start ecosystem.config.cjs --only nature-secret-web` and `pm2 save`. If the error persists, ensure `node_modules` exists: from repo root run `npm ci` then `npm run build`, then start PM2 again.

**"Failed to find Server Action \"1\". This request might be from an older or newer deployment."**

The browser is using cached pages from a previous build; Server Action IDs changed after a new deploy. On the droplet do a clean rebuild and restart: `cd /var/www/nature-secret && rm -rf .next && npm run build && pm2 restart nature-secret-web && pm2 save`. Users should hard-refresh (Ctrl+Shift+R or Cmd+Shift+R) or clear cache for the site.

---

## 10. CI/CD with GitHub Actions

The repo includes a workflow (`.github/workflows/deploy.yml`) that builds and deploys to your droplet on every push to `main`. It SSHs into the server, pulls the latest code, runs `npm ci` and `npm run build` for backend and frontend, then `pm2 restart all`.

**One-time setup**

1. **On the droplet:** Clone the repo to `/var/www/nature-secret`, add backend `.env` and frontend `.env.local`, run seed and PM2 once (sections 4–6 above). Ensure the user you use for SSH can run `pm2` (e.g. same user that owns the app files).

2. **SSH key for GitHub Actions:** On your laptop (or droplet), generate a key for the deploy bot:
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key -N ""
   ```
   - Add the **public** key (`deploy_key.pub`) to the droplet: `cat deploy_key.pub >> ~/.ssh/authorized_keys` (as the deploy user on the droplet).
   - Copy the **private** key (`deploy_key`) and add it as a GitHub secret (see below).

3. **GitHub repo secrets:** In the repo → Settings → Secrets and variables → Actions, add:

   | Secret        | Value |
   |---------------|--------|
   | `VPS_HOST`   | Droplet IP or domain (e.g. `165.232.123.45` or `api.yourdomain.com`) |
   | `VPS_USERNAME` | SSH user (e.g. `root` or a sudo user) |
   | `VPS_SSH_KEY`  | Full contents of the **private** key file (`deploy_key`) |
   | `GH_TOKEN`     | GitHub Personal Access Token with `repo` and `workflow` scope (so the server can `git pull` private repo) |

4. **First deploy:** Push to `main` or run the “Build and Deploy” workflow manually from the Actions tab. Check the workflow log and the droplet (`pm2 logs`) if something fails.

**Flow:** Push to `main` → workflow runs build on GitHub → SSH to droplet → `git pull` → `npm ci` + `npm run build` (backend then frontend) → `pm2 restart all` → `pm2 save`.

---

## 11. Manual deploy (without CI/CD)

```bash
cd /var/www/nature-secret
git pull
cd backend && npm ci && npm run build && cd ..
npm ci && npm run build
pm2 restart all
```

If you use uploads, ensure `UPLOAD_ROOT` points outside the repo so uploads are not overwritten.
