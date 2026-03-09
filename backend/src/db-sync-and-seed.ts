/**
 * Updates DB structure (TypeORM synchronize) then seeds admin users, categories, and hero slides.
 * Run: npm run db:setup  (or npx ts-node -r tsconfig-paths/register src/db-sync-and-seed.ts)
 * Requires .env with MYSQL_* (or defaults for local dev).
 */
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  });
}

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AdminUser } from './entities/admin-user.entity';
import { Category } from './entities/category.entity';
import { HeroSlide } from './entities/hero-slide.entity';
import { Product } from './entities/product.entity';
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

const DEFAULT_ADMINS = [
  { email: 'admin@naturesecret.com', password: 'Admin123!', role: 'admin' as const },
  { email: 'staff@naturesecret.com', password: 'Staff123!', role: 'staff' as const },
  { email: 'm.waseemmirzaa@gmail.com', password: 'Ns#Adm2024!Wm7xQ', role: 'admin' as const },
];

const DEFAULT_CATEGORIES = [
  { name: 'Skin care', slug: 'skin-care' },
  { name: 'Herbal oil', slug: 'herbal-oil' },
];

const DEFAULT_HERO_SLIDES = [
  { imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=1200', alt: 'Premium herbal oil for pain relief', title: 'Pain care oils', href: '/shop?category=herbal-oil', sortOrder: 0 },
  { imageUrl: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1200', alt: 'Natural herbal blends', title: 'Herbal oil', href: '/shop?category=herbal-oil', sortOrder: 1 },
  { imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200', alt: 'Natural ingredients for wellness', title: 'Natural relief', href: '/shop?category=herbal-oil', sortOrder: 2 },
  { imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200', alt: 'Skincare serums and care', title: 'Skincare', href: '/shop?category=skin-care', sortOrder: 3 },
  { imageUrl: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1200', alt: 'Premium skincare routine', title: 'Skin care', href: '/shop?category=skin-care', sortOrder: 4 },
  { imageUrl: 'https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?w=1200', alt: 'Clean skincare products', title: 'Coming soon', href: '/shop?category=skin-care', sortOrder: 5 },
];

async function run() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    username: process.env.MYSQL_USER || 'nature_secret',
    password: process.env.MYSQL_PASSWORD || 'nature_secret_dev',
    database: process.env.MYSQL_DATABASE || 'nature_secret',
    charset: 'utf8mb4',
    entities: ALL_ENTITIES,
    synchronize: true,
  });

  await dataSource.initialize();
  console.log('DB connected. Running synchronize to update structure...');

  await dataSource.synchronize();
  console.log('DB structure updated.');

  const adminRepo = dataSource.getRepository(AdminUser);
  const categoryRepo = dataSource.getRepository(Category);
  const slideRepo = dataSource.getRepository(HeroSlide);

  let adminCount = 0;
  try {
    adminCount = await adminRepo.count();
  } catch (e) {
    console.error('Seed: admin count failed', e?.message || e);
    await dataSource.destroy();
    process.exit(1);
  }

  if (adminCount === 0) {
    for (const a of DEFAULT_ADMINS) {
      try {
        const hash = await bcrypt.hash(a.password, 10);
        await adminRepo.save(adminRepo.create({ email: a.email, passwordHash: hash, role: a.role }));
        console.log('Seeded admin:', a.email, `(${a.role})`);
      } catch (e) {
        console.error('Seed: admin save failed', a.email, e?.message || e);
      }
    }
  } else {
    for (const a of DEFAULT_ADMINS) {
      const existing = await adminRepo.findOne({ where: { email: a.email } });
      if (!existing) {
        try {
          const hash = await bcrypt.hash(a.password, 10);
          await adminRepo.save(adminRepo.create({ email: a.email, passwordHash: hash, role: a.role }));
          console.log('Seeded admin:', a.email, `(${a.role})`);
        } catch (e) {
          console.error('Seed: admin save failed', a.email, e?.message || e);
        }
      }
    }
  }

  const categoryCount = await categoryRepo.count();
  if (categoryCount === 0) {
    for (const c of DEFAULT_CATEGORIES) {
      await categoryRepo.save(categoryRepo.create(c));
    }
    console.log('Seeded categories:', DEFAULT_CATEGORIES.map((c) => c.slug).join(', '));
  }

  const slideCount = await slideRepo.count();
  if (slideCount === 0) {
    for (let i = 0; i < DEFAULT_HERO_SLIDES.length; i++) {
      await slideRepo.save(slideRepo.create(DEFAULT_HERO_SLIDES[i]));
    }
    console.log('Seeded hero slides:', DEFAULT_HERO_SLIDES.length);
  }

  console.log('DB setup completed.');
  await dataSource.destroy();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
