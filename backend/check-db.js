/**
 * Check if data exists in DB (MySQL). Run: node check-db.js
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

const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'nature_secret',
  password: process.env.MYSQL_PASSWORD || 'nature_secret_dev',
  database: process.env.MYSQL_DATABASE || 'nature_secret',
};

async function check() {
  try {
    const mysql = require('mysql2/promise');
    const c = await mysql.createConnection(config);
    console.log('Connected to MySQL\n');

    const [admins] = await c.query('SELECT id, email, role FROM admin_users');
    console.log('admin_users:', admins.length);
    admins.forEach((r) => console.log('  -', r.email, r.role));

    const [categories] = await c.query('SELECT id, name, slug FROM categories');
    console.log('\ncategories:', categories.length);
    categories.forEach((r) => console.log('  -', r.name, r.slug));

    const [products] = await c.query('SELECT id, name, slug FROM products');
    console.log('\nproducts:', products.length);
    products.forEach((r) => console.log('  -', r.name, r.slug));

    await c.end();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

check();
