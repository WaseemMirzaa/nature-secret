/**
 * Print INSERT SQL for admin + staff. Run: node print-admin-sql.js
 * Copy the output and run it in phpMyAdmin (SQL tab) if the table is empty.
 */
const bcrypt = require('bcryptjs');

const admins = [
  { email: 'admin@naturesecret.pk', password: 'Admin123!', role: 'admin' },
  { email: 'staff@naturesecret.pk', password: 'Staff123!', role: 'staff' },
];

async function main() {
  console.log('-- Run this SQL in phpMyAdmin if admin_users is empty:\n');
  for (const a of admins) {
    const hash = await bcrypt.hash(a.password, 10);
    console.log(
      `INSERT INTO admin_users (id, email, passwordHash, role, twoFactorEnabled) VALUES (UUID(), '${a.email}', '${hash}', '${a.role}', 0);`
    );
  }
  console.log('\n-- Then log in with admin@naturesecret.pk / Admin123!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
