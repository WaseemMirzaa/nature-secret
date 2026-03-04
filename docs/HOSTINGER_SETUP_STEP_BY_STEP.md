# Step-by-step: Host Nature Secret on Hostinger

Follow these steps in order to host the web app on Hostinger (VPS + MySQL).

---

## Step 1: Get a Hostinger VPS and note access

1. Log in to [Hostinger](https://www.hostinger.com) (hPanel).
2. Go to **VPS** and order a VPS (or use an existing one).
3. Note:
   - **VPS IP address** (e.g. `123.45.67.89`)
   - **SSH username** (often `root`)
   - **SSH password** or set up **SSH key** in the VPS panel.

---

## Step 2: Create MySQL database on Hostinger

1. In hPanel go to **Databases → MySQL** (or **MySQL Databases**).
2. **Create a new database** (e.g. name: `nature_secret`).
3. **Create a user** with a strong password and **assign it to that database** with full privileges.
4. Note:
   - **Database name**
   - **Username**
   - **Password**
   - **Host** (often `localhost` or a host like `mysql123.hostinger.com` – use what Hostinger shows).

---

## Step 2b: Connect the app to MySQL

The backend uses these env vars to connect. Set them in **backend/.env** (see Step 5) using the values from Step 2.

| Variable         | Where to get it |
|------------------|------------------|
| `MYSQL_HOST`     | In hPanel → Databases → MySQL: use the **Host** (e.g. `localhost` or `srv123.hostinger.com`). For Hostinger shared MySQL it is usually **not** `localhost` – copy the exact hostname. |
| `MYSQL_PORT`     | Usually `3306`. |
| `MYSQL_USER`     | The MySQL username you created. |
| `MYSQL_PASSWORD` | The MySQL password you set. |
| `MYSQL_DATABASE` | The database name (e.g. `nature_secret`). |

**If MySQL is on Hostinger (separate from VPS):**  
Use the **remote MySQL host** Hostinger gives you (e.g. `mysqlXX.hostinger.com` or similar). Your VPS will connect to that host over the internet. No extra firewall rules are usually needed for Hostinger MySQL.

**If you install MySQL on the same VPS:**  
Use `MYSQL_HOST=localhost`. Create the database and user on the VPS and use those credentials.

**Verify connection:** After backend `.env` is set and you run the API (Step 8), check PM2 logs: `pm2 logs nature-api`. If you see “Nest application successfully started” and no “Unable to connect to the database”, MySQL is connected. You can also run `node check-db.js` inside `backend/` (it reads `.env` and connects to MySQL) to confirm.

---

## Step 3: Connect to the VPS and install Node + PM2

1. On your computer, open a terminal and SSH in:
   ```bash
   ssh root@YOUR_VPS_IP
   ```
   (Use the password or SSH key you set.)

2. Install Node.js 20 (Ubuntu/Debian example):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   node -v
   ```

3. Install PM2 globally:
   ```bash
   sudo npm install -g pm2
   ```

---

## Step 4: Clone the repo on the VPS

1. Still on the VPS:
   ```bash
   sudo mkdir -p /var/www/nature-secret
   sudo chown $USER:$USER /var/www/nature-secret
   cd /var/www/nature-secret
   ```

2. Clone (use your repo URL; for private repo you’ll need a token or deploy key):
   ```bash
   git clone https://github.com/WaseemMirzaa/nature-secret.git .
   ```

---

## Step 5: Create backend `.env` on the VPS

1. On the VPS:
   ```bash
   nano /var/www/nature-secret/backend/.env
   ```

2. Paste and fill with your real values (use the MySQL details from Step 2):
   ```env
   NODE_ENV=production
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_USER=your_db_user
   MYSQL_PASSWORD=your_db_password
   MYSQL_DATABASE=nature_secret

   JWT_SECRET=use-a-long-random-string-here-at-least-32-chars
   ENCRYPTION_KEY=another-long-random-string-32-chars-minimum

   PORT=4000
   FRONTEND_ORIGIN=https://yourdomain.com

   GMAIL_USER=
   GMAIL_APP_PASSWORD=
   TWILIO_ACCOUNT_SID=
   TWILIO_AUTH_TOKEN=
   TWILIO_WHATSAPP_FROM=
   ```
   Save and exit (Ctrl+O, Enter, Ctrl+X).

---

## Step 6: Create frontend env on the VPS

1. On the VPS:
   ```bash
   nano /var/www/nature-secret/.env.production
   ```

2. Add (replace with your real API URL and domain):
   ```env
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   ```
   Or if you’re testing by IP: `http://YOUR_VPS_IP:4000`.  
   Save and exit.

---

## Step 7: Build and seed (first time on VPS)

1. Backend:
   ```bash
   cd /var/www/nature-secret/backend
   npm ci
   npm run build
   node seed-admin.js
   ```

2. Frontend:
   ```bash
   cd /var/www/nature-secret
   npm ci
   npm run build
   ```

---

## Step 8: Start apps with PM2

On the VPS:

```bash
cd /var/www/nature-secret/backend
pm2 start dist/main.js --name nature-api

cd /var/www/nature-secret
pm2 start npm --name nature-web -- start

pm2 save
pm2 startup
```

Follow the command `pm2 startup` prints so PM2 runs after reboot.

---

## Step 9: Install and configure Nginx (reverse proxy)

1. On the VPS:
   ```bash
   sudo apt update
   sudo apt install -y nginx
   ```

2. Create a site config (replace `yourdomain.com` and `YOUR_VPS_IP`):
   ```bash
   sudo nano /etc/nginx/sites-available/nature-secret
   ```

3. Paste (adjust domain and paths if needed):
   ```nginx
   # API (NestJS) – e.g. api.yourdomain.com or yourdomain.com/api
   server {
       listen 80;
       server_name api.yourdomain.com;
       location / {
           proxy_pass http://127.0.0.1:4000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       location /api/v1/ws {
           proxy_pass http://127.0.0.1:4000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }

   # Frontend (Next.js)
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;
       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
       }
   }
   ```

4. Enable and test:
   ```bash
   sudo ln -s /etc/nginx/sites-available/nature-secret /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

## Step 10: Point domain to the VPS

1. In your domain registrar (or Hostinger DNS):
   - **A record:** `yourdomain.com` → VPS IP
   - **A record:** `www.yourdomain.com` → VPS IP
   - **A record:** `api.yourdomain.com` → VPS IP

2. Wait for DNS to propagate (up to 24–48 hours, often minutes).

---

## Step 11: (Optional) HTTPS with Let’s Encrypt

On the VPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

Follow prompts. Certbot will adjust Nginx for HTTPS.

---

## Step 12: GitHub Actions CI/CD (optional)

1. **GitHub repo secrets**  
   Repo → **Settings → Secrets and variables → Actions**. Add:
   - `VPS_HOST` = VPS IP
   - `VPS_USERNAME` = e.g. `root`
   - `VPS_SSH_KEY` = full contents of your **private** SSH key
   - `GH_TOKEN` = GitHub Personal Access Token (repo + workflow scope)

2. **SSH key for deploy**  
   On your computer:
   ```bash
   ssh-keygen -t ed25519 -C "deploy" -f deploy_key -N ""
   ```
   - Add `deploy_key.pub` to the VPS: `ssh-copy-id -i deploy_key.pub root@YOUR_VPS_IP`
   - Put the **private** key content into the secret `VPS_SSH_KEY`.

3. **Workflow**  
   Ensure `.github/workflows/deploy.yml` is in the repo. Each push to `main` will build and deploy (pull, build, PM2 restart).

---

## Step 13: Verify

- Frontend: **https://yourdomain.com**
- API: **https://api.yourdomain.com/api/v1**
- Admin: **https://yourdomain.com/admin** (e.g. `admin@naturesecret.com` / `Admin123!`)

---

## Quick checklist

- [ ] VPS and MySQL created; credentials saved
- [ ] Node 20 and PM2 installed on VPS
- [ ] Repo cloned to `/var/www/nature-secret`
- [ ] `backend/.env` and `.env.production` created with real values
- [ ] Backend built and `seed-admin.js` run
- [ ] Frontend built
- [ ] PM2 running `nature-api` and `nature-web`; `pm2 save` and `pm2 startup` done
- [ ] Nginx installed and config for API + frontend + `/api/v1/ws` added and reloaded
- [ ] Domain A records point to VPS IP
- [ ] (Optional) HTTPS with Certbot
- [ ] (Optional) GitHub secrets and deploy key set for CI/CD
