/**
 * TypeORM CLI data source (migrations). Load env like db-sync-and-seed.
 * Run: npm run migration:run
 */
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';

const envPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  });
}

const migrationsDir = path.join(__dirname, 'migrations');

export default new DataSource({
  type: 'mysql',
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  username: process.env.MYSQL_USER || 'nature_secret',
  password: process.env.MYSQL_PASSWORD || 'nature_secret_dev',
  database: process.env.MYSQL_DATABASE || 'nature_secret',
  charset: 'utf8mb4',
  synchronize: false,
  logging: false,
  entities: [],
  migrations: [path.join(migrationsDir, '*.{ts,js}')],
});
