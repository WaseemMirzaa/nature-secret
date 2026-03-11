-- Run this in phpMyAdmin (SQL tab) if admin_users is empty.
-- Then log in with admin@naturesecret.pk / Admin123! or staff@naturesecret.pk / Staff123!

INSERT INTO admin_users (id, email, passwordHash, role, twoFactorEnabled) VALUES (UUID(), 'admin@naturesecret.pk', '$2a$10$KKOfg/vwbAX3ZqVzpW/TPO0tcdNjF5bvYcPVXyBSXkV94LRZP2Joa', 'admin', 0);
INSERT INTO admin_users (id, email, passwordHash, role, twoFactorEnabled) VALUES (UUID(), 'staff@naturesecret.pk', '$2a$10$EmYmYbz1U.PbpcrQvmWJf.ksB725TiqCcgST8JpAO/bj/AwHkBjE.', 'staff', 0);
