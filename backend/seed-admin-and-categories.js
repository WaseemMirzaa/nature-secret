/**
 * Seed admin users and categories (MySQL). Run: node seed-admin-and-categories.js
 * Uses same data as seed-on-startup. Requires: mysql2, bcryptjs.
 */
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  });
}

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const admins = [
  { email: 'admin@naturesecret.com', password: 'Admin123!', role: 'admin' },
  { email: 'staff@naturesecret.com', password: 'Staff123!', role: 'staff' },
  { email: 'm.waseemmirzaa@gmail.com', password: 'Ns#Adm2024!Wm7xQ', role: 'admin' },
];

const categories = [
  { name: 'Skin care', slug: 'skin-care' },
  { name: 'Herbal oil', slug: 'herbal-oil' },
];

const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'nature_secret',
  password: process.env.MYSQL_PASSWORD || 'nature_secret_dev',
  database: process.env.MYSQL_DATABASE || 'nature_secret',
};

async function seed() {
  let conn;
  try {
    conn = await mysql.createConnection(config);
    console.log('Connected to MySQL');

    for (const a of admins) {
      const [rows] = await conn.execute('SELECT id FROM admin_users WHERE email = ?', [a.email]);
      if (rows.length > 0) {
        console.log('Admin already exists:', a.email);
        continue;
      }
      const passwordHash = await bcrypt.hash(a.password, 10);
      await conn.execute(
        'INSERT INTO admin_users (id, email, passwordHash, role, twoFactorEnabled) VALUES (UUID(), ?, ?, ?, 0)',
        [a.email, passwordHash, a.role]
      );
      console.log('Seeded admin:', a.email, `(${a.role})`);
    }

    for (const c of categories) {
      const [rows] = await conn.execute('SELECT id FROM categories WHERE slug = ?', [c.slug]);
      if (rows.length > 0) {
        console.log('Category already exists:', c.slug);
        continue;
      }
      await conn.execute('INSERT INTO categories (id, name, slug) VALUES (UUID(), ?, ?)', [c.name, c.slug]);
      console.log('Seeded category:', c.slug);
    }

    console.log('Done (admin users + categories).');
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

seed();
