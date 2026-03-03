# Host Nature Secret on Hostinger + MySQL + GitHub CI/CD

## Overview

- **Frontend:** Next.js (built and served with `next start`, or static export if you prefer).
- **Backend:** NestJS API (Node.js).
- **Database:** MySQL (Hostinger MySQL or same VPS).
- **CI/CD:** GitHub Actions builds on every push and deploys to your Hostinger VPS via SSH.

---

## 1. Hostinger setup

### 1.1 VPS

- In Hostinger (hPanel), order a **VPS** (or use an existing one).
- Note the **IP**, **SSH user** (often `root`), and set an SSH key or password for SSH.

### 1.2 MySQL

- In hPanel open **Databases → MySQL**.
- Create a database and a user with full rights on that database.
- Note: **host** (often `localhost` or the DB server host), **database name**, **user**, **password**.

### 1.3 Domain (optional)

- Point your domain (e.g. `app.yourdomain.com`) to the VPS IP via an **A record**.

---

## 2. Server setup (one-time on the VPS)

SSH into the VPS and install Node, PM2, and (if MySQL is on the same server) MySQL.

```bash
# SSH
ssh root@YOUR_VPS_IP

# Node 20 (example for Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2
sudo npm install -g pm2

# (Optional) MySQL on same server
# sudo apt install mysql-server
# Create DB and user to match backend .env
```

Create app directory and clone repo (first time):

```bash
sudo mkdir -p /var/www/nature-secret
sudo chown $USER:$USER /var/www/nature-secret
cd /var/www/nature-secret
git clone https://github.com/YOUR_USERNAME/nature_secret.git .
```

Create env files (do not commit these):

```bash
# Backend
nano /var/www/nature-secret/backend/.env
# Set at least:
# MYSQL_HOST=... MYSQL_USER=... MYSQL_PASSWORD=... MYSQL_DATABASE=...
# JWT_SECRET=... ENCRYPTION_KEY=... PORT=4000 FRONTEND_ORIGIN=https://yourdomain.com
```

```bash
# Frontend (for next start)
nano /var/www/nature-secret/.env.production
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com
# or http://YOUR_VPS_IP:4000
```

Install, build, and run with PM2 (first time):

```bash
cd /var/www/nature-secret/backend
npm ci --production=false
npm run build
# Seed admin once
node seed-admin.js

cd /var/www/nature-secret
npm ci
npm run build
```

```bash
# Start backend
cd /var/www/nature-secret/backend && pm2 start dist/main.js --name nature-api

# Start frontend
cd /var/www/nature-secret && pm2 start npm --name nature-web -- start

pm2 save
pm2 startup
```

Use Nginx (or Caddy) as reverse proxy so the app is served on ports 80/443 and the API on a path or subdomain (e.g. `api.yourdomain.com`).

---

## 3. GitHub Actions CI/CD

### 3.1 Secrets

In GitHub: **Repo → Settings → Secrets and variables → Actions**. Add:

| Secret           | Description                    |
|------------------|--------------------------------|
| `VPS_HOST`       | VPS IP address                 |
| `VPS_USERNAME`   | SSH user (e.g. `root`)         |
| `VPS_SSH_KEY`    | Private SSH key for that user  |

(Optional) If the workflow writes `.env` on the server from secrets, add e.g. `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `JWT_SECRET`, `ENCRYPTION_KEY` and use them in the deploy step.

### 3.2 SSH key

On your machine:

```bash
ssh-keygen -t ed25519 -C "github-actions" -f deploy_key -N ""
```

- Add **public** key to the VPS: `ssh-copy-id -i deploy_key.pub root@YOUR_VPS_IP` (or paste contents into `~/.ssh/authorized_keys`).
- Paste **private** key (`deploy_key`) into the GitHub secret `VPS_SSH_KEY`.

### 3.3 Workflow file

The workflow in **`.github/workflows/deploy.yml`** (in this repo) will:

1. Run on every **push to `main`**.
2. **Build** the Next.js frontend and NestJS backend (to verify they compile).
3. **SSH** into the VPS, **git pull**, run **npm ci** and **npm run build** for backend and frontend, then **pm2 restart** both apps.

Default app path on the VPS: **`/var/www/nature-secret`**. Ensure the repo is cloned there and the first-time setup (env, seed, PM2 start) is done before relying on the workflow.

---

## 4. What the workflow does

- **Checkout** the repo.
- **Build frontend:** `npm ci`, `npm run build`.
- **Build backend:** `cd backend`, `npm ci`, `npm run build`.
- **Deploy:** SSH into the VPS, pull latest code (or rsync build artifacts), run `npm ci` and `npm run build` on the server (or use the built artifacts), then `pm2 restart nature-api` and `pm2 restart nature-web`.

After you push to `main`, the GitHub Actions run will build and update the server automatically.

---

## 5. Quick checklist

- [ ] Hostinger VPS and MySQL created; credentials noted.
- [ ] SSH access to VPS works; Node and PM2 installed.
- [ ] Repo cloned on VPS; backend `.env` and frontend env set.
- [ ] Backend and frontend built and run with PM2; reverse proxy (Nginx) configured.
- [ ] GitHub secrets `VPS_HOST`, `VPS_USERNAME`, `VPS_SSH_KEY` set.
- [ ] `.github/workflows/deploy.yml` in the repo; push to `main` triggers build and deploy.

---

## 6. Alternative: Hostinger Node.js managed hosting

If you use **Hostinger’s Node.js** (e.g. Business/Cloud) instead of a VPS:

- In hPanel, use the built-in **GitHub integration** to connect the repo and set the branch.
- Set **start command** to your backend (e.g. `npm run start` in `backend/`) and ensure the app uses the Hostinger MySQL credentials via their env/config.
- For a separate Next.js frontend, you may need a second Node app or a static export deployed to the same or another Hostinger space; follow Hostinger’s Node.js docs for the exact steps.

The GitHub Actions workflow in this repo is aimed at a **VPS + SSH** deploy; for managed Node.js you rely on Hostinger’s own deploy-on-push from GitHub.
