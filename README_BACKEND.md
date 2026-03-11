# Nature Secret – Run full stack (MySQL + API + Frontend)

Uses **MySQL** (Hostinger-compatible). Local dev: use Docker or a local MySQL instance.

## 1. MySQL

**Local (no Docker):** Install MySQL (e.g. `brew install mysql && brew services start mysql`), then:
```bash
npm run db:reset
```
This drops and recreates the `nature_secret` database and user. If root has a password, set `MYSQL_ROOT_PASSWORD` in `backend/.env`.

**Hostinger:** Create a MySQL database in the panel and set `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` in backend `.env`.

## 2. Backend (NestJS)

```bash
cd backend
npm install
cp .env.example .env   # set MySQL and other vars
npm run start:dev
```

First run creates tables. In a **second terminal**, seed admin users:

```bash
cd backend
npm run seed:admin
```

Admins:
- **Admin:** `admin@naturesecret.pk` / `Admin123!`
- **Staff:** `staff@naturesecret.pk` / `Staff123!`

API: http://localhost:4000/api/v1

## 3. Frontend (Next.js)

From project root (not inside backend):

```bash
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" >> .env.local
npm run dev
```

App: http://localhost:3000 (or next free port)

## 4. Admin login (after seed)

- Email: `admin@naturesecret.pk`  
- Password: `Admin123!`

Staff: `staff@naturesecret.pk` / `Staff123!`

## 5. New order notifications (admin)

When a new order is placed, admin/staff get a **browser notification** and a **bell sound** in real time (WebSocket). Allow notifications when the browser prompts after logging into admin.

## Security

- **Encryption:** PII (customer name, email, phone, address in orders/customers) and product name/description are encrypted at rest (AES-256-GCM). Set `ENCRYPTION_KEY` (32+ chars) in production.
- **Passwords:** Bcrypt hashed; never stored in plain text.
- **API:** Validation (class-validator), CORS, rate limiting; all DB access via TypeORM (parameterized, no raw SQL injection).
