/**
 * Seed pending customer reviews (`collection: user`, `approved: false`) for a product.
 * Approve in Admin → Products → edit product (or POST .../approve-all-pending).
 *
 * Usage (from backend/):
 *   npm run db:seed:reviews
 *   npx ts-node -r tsconfig-paths/register src/seed-reviews-batch.ts
 *   npx ts-node -r tsconfig-paths/register src/seed-reviews-batch.ts -- --product-id=<UUID>
 *   npx ts-node -r tsconfig-paths/register src/seed-reviews-batch.ts -- --file=seeds/my.json
 *
 * Env:
 *   PRODUCT_ID          — overrides JSON `productId`
 *   REVIEWS_JSON        — path to JSON (relative to backend/ or absolute)
 *   FORCE_REVIEWS_SEED=1 — insert even if product already has 50+ user reviews
 *
 * JSON shapes (file or stdin not supported; file only):
 *   { "productId": "<uuid>", "reviews": [ { "name", "review", "rating" }, ... ] }
 *   { "reviews": [ ... ] }  — requires --product-id or PRODUCT_ID
 *   [ { "name", "review", "rating" }, ... ]  — requires --product-id or PRODUCT_ID
 */
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
    });
}

import { DataSource } from 'typeorm';
import { Review } from './entities/review.entity';
import { Product } from './entities/product.entity';
import { AdminUser } from './entities/admin-user.entity';
import { Category } from './entities/category.entity';
import { HeroSlide } from './entities/hero-slide.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusTimeline } from './entities/order-status-timeline.entity';
import { Customer } from './entities/customer.entity';
import { CustomerNote } from './entities/customer-note.entity';
import { BlogPost } from './entities/blog-post.entity';
import { BlogCategory } from './entities/blog-category.entity';
import { BlogTemplate } from './entities/blog-template.entity';
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { DiscountCode } from './entities/discount-code.entity';

const ALL_ENTITIES = [
  AdminUser,
  Category,
  HeroSlide,
  Product,
  ProductVariant,
  Review,
  Order,
  OrderItem,
  OrderStatusTimeline,
  Customer,
  CustomerNote,
  BlogPost,
  BlogCategory,
  BlogTemplate,
  AnalyticsEvent,
  DiscountCode,
];

type Row = { name: string; review: string; rating: number };

/** Args after `seed-reviews-batch.ts` (e.g. npm run db:seed:reviews -- --product-id=...) */
function tailCliArgs(): string[] {
  const a = process.argv;
  const i = a.findIndex((x) => x.endsWith('seed-reviews-batch.ts'));
  if (i < 0) return [];
  return a.slice(i + 1).filter((x) => x !== '--');
}

function parseArgs(argv: string[]) {
  let productId = (process.env.PRODUCT_ID || '').trim();
  let fileRel = (process.env.REVIEWS_JSON || '').trim();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--product-id=')) productId = a.slice('--product-id='.length).trim();
    else if (a === '--product-id' && argv[i + 1]) productId = argv[++i].trim();
    else if (a.startsWith('--file=')) fileRel = a.slice('--file='.length).trim();
    else if (a === '--file' && argv[i + 1]) fileRel = argv[++i].trim();
  }
  return { productId, fileRel };
}

function resolveJsonPath(fileRel: string): string {
  const backendRoot = path.join(__dirname, '..');
  if (!fileRel) return path.join(backendRoot, 'seeds', 'reviews-batch.json');
  if (path.isAbsolute(fileRel)) return fileRel;
  return path.join(backendRoot, fileRel);
}

function parseJson(raw: string): { productId: string; reviews: Row[] } {
  const parsed = JSON.parse(raw) as unknown;
  if (Array.isArray(parsed)) {
    return { productId: '', reviews: parsed as Row[] };
  }
  if (parsed && typeof parsed === 'object') {
    const o = parsed as { productId?: string; reviews?: Row[] };
    const reviews = Array.isArray(o.reviews) ? o.reviews : [];
    return { productId: String(o.productId || '').trim(), reviews };
  }
  return { productId: '', reviews: [] };
}

async function run() {
  const { productId: cliProductId, fileRel } = parseArgs(tailCliArgs());
  const jsonPath = resolveJsonPath(fileRel);

  if (!fs.existsSync(jsonPath)) {
    console.error('Missing JSON file:', jsonPath);
    console.error('Create it or pass --file=seeds/your-reviews.json');
    process.exit(1);
  }

  let data: { productId: string; reviews: Row[] };
  try {
    data = parseJson(fs.readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    console.error('Invalid JSON:', jsonPath, e);
    process.exit(1);
  }

  const productId = cliProductId || data.productId || (process.env.PRODUCT_ID || '').trim();
  const rows = data.reviews;

  if (!productId) {
    console.error('Set product id: JSON "productId", env PRODUCT_ID, or --product-id=<uuid>');
    process.exit(1);
  }
  if (!rows.length) {
    console.error('No reviews in file. Expected { "reviews": [ { "name", "review", "rating" } ] }');
    process.exit(1);
  }

  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    username: process.env.MYSQL_USER || 'nature_secret',
    password: process.env.MYSQL_PASSWORD || 'nature_secret_dev',
    database: process.env.MYSQL_DATABASE || 'nature_secret',
    charset: 'utf8mb4',
    entities: ALL_ENTITIES,
    synchronize: false,
  });

  await dataSource.initialize();
  const productRepo = dataSource.getRepository(Product);
  const reviewRepo = dataSource.getRepository(Review);

  const product = await productRepo.findOne({ where: { id: productId } });
  if (!product) {
    console.error('Product not found:', productId);
    await dataSource.destroy();
    process.exit(1);
  }

  const existingUser = await reviewRepo.count({
    where: { productId, collection: 'user' },
  });
  if (existingUser >= 50 && process.env.FORCE_REVIEWS_SEED !== '1') {
    console.log(
      `Skip: product already has ${existingUser} user reviews (set FORCE_REVIEWS_SEED=1 to insert anyway).`,
    );
    await dataSource.destroy();
    process.exit(0);
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const authorName = String(row.name || 'Customer').slice(0, 255);
    const body = String(row.review || '').trim();
    if (!body) continue;
    const rating = Math.min(5, Math.max(1, Number(row.rating) || 5));
    const entity = reviewRepo.create({
      productId,
      authorName,
      body,
      rating,
      collection: 'user',
      approved: false,
      sortOrder: Math.min(999, i),
      media: null,
    });
    await reviewRepo.save(entity);
    inserted += 1;
  }

  console.log(
    `Inserted ${inserted} pending reviews for product ${productId} (${product.name || 'unnamed'}). File: ${jsonPath}`,
  );
  await dataSource.destroy();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
