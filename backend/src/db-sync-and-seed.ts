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
import { PAINREX_PRODUCT_DESCRIPTION_HTML } from './seed-painrex-description';

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
  { email: 'admin@naturesecret.pk', password: 'Admin123!', role: 'admin' as const },
  { email: 'staff@naturesecret.pk', password: 'Staff123!', role: 'staff' as const },
  { email: 'm.waseemmirzaa@gmail.com', password: 'Ns#Adm2024!Wm7xQ', role: 'admin' as const },
];

const DEFAULT_CATEGORIES = [
  { name: 'Skin care', slug: 'skin-care' },
  { name: 'Herbal oil', slug: 'herbal-oil' },
];

const DEFAULT_HERO_SLIDES = [
  { imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=1200', alt: 'Premium herbal oil for daily body care', title: 'Herbal care oils', href: '/shop?category=herbal-oil', sortOrder: 0 },
  { imageUrl: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1200', alt: 'Natural herbal blends', title: 'Herbal oil', href: '/shop?category=herbal-oil', sortOrder: 1 },
  { imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200', alt: 'Natural ingredients for body care', title: 'Daily ritual', href: '/shop?category=herbal-oil', sortOrder: 2 },
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

  const productRepo = dataSource.getRepository(Product);
  const variantRepo = dataSource.getRepository(ProductVariant);
  const customerRepo = dataSource.getRepository(Customer);

  const herbalCat = await categoryRepo.findOne({ where: { slug: 'herbal-oil' } });
  if (herbalCat) {
    const demoSlug = 'nature-secret-px-oil';
    let demoProduct = await productRepo.findOne({ where: { slug: demoSlug }, relations: ['variants'] });
    if (!demoProduct) {
      demoProduct = productRepo.create({
        name: 'Painrex Oil',
        slug: demoSlug,
        categoryId: herbalCat.id,
        badge: 'Bestseller',
        badgeSub: 'Top selling',
        price: 49900,
        description: PAINREX_PRODUCT_DESCRIPTION_HTML,
        benefits: [
          'Relaxing massage for neck & muscles',
          'Comforting joints & tight-feeling areas',
          'Daily unwind ritual',
          'Fast-absorbing texture',
          'Non-greasy finish',
        ],
        images: ['/assets/nature-secret-logo.svg'],
        rating: 4.8,
        reviewCount: 37,
        inventory: 100,
        isBestseller: true,
        outOfStock: false,
        faq: [
          { q: 'Where to use?', a: 'For external body care use. Apply as needed to clean skin.' },
          { q: 'How to apply?', a: 'Apply a few drops to the desired area and massage gently.' },
        ],
      });
      await productRepo.save(demoProduct);
      await variantRepo.save([
        variantRepo.create({
          productId: demoProduct.id,
          name: '50 ml',
          volume: '50ml',
          price: 49900,
          image: '/assets/nature-secret-logo.svg',
        }),
        variantRepo.create({
          productId: demoProduct.id,
          name: '100 ml',
          volume: '100ml',
          price: 89900,
          image: '/assets/nature-secret-logo.svg',
        }),
      ]);
      console.log('Seeded demo product:', demoSlug);
    } else {
      demoProduct.name = 'Painrex Oil';
      demoProduct.description = PAINREX_PRODUCT_DESCRIPTION_HTML;
      demoProduct.reviewCount = 37;
      await productRepo.save(demoProduct);
      console.log('Updated demo product copy:', demoSlug);
    }

    const quickSlug = 'demo-product';
    let quick = await productRepo.findOne({ where: { slug: quickSlug }, relations: ['variants'] });
    if (!quick) {
      quick = productRepo.create({
        name: 'Demo product (local test)',
        slug: quickSlug,
        categoryId: herbalCat.id,
        badge: 'Demo',
        badgeSub: 'Testing',
        price: 10000,
        description:
          '<p><strong>Local demo product.</strong> Open this page at <code>/shop/demo-product</code> to test checkout and PDP.</p>',
        benefits: ['Test add to cart', 'Test Order Now', 'Safe to delete in production'],
        images: ['/assets/nature-secret-logo.svg'],
        rating: 4.9,
        reviewCount: 12,
        inventory: 99,
        isBestseller: false,
        outOfStock: false,
        faq: [{ q: 'Is this real stock?', a: 'No — for development and QA only.' }],
      });
      await productRepo.save(quick);
      await variantRepo.save([
        variantRepo.create({
          productId: quick.id,
          name: '50 ml',
          volume: '50ml',
          price: 10000,
          image: '/assets/nature-secret-logo.svg',
        }),
      ]);
      console.log('Seeded demo product for testing:', quickSlug, '→ /shop/' + quickSlug);
    }
  }

  const demoCustomers = [
    { email: 'customer1@demo.local', password: 'Demo123!', name: 'Demo Customer One' },
    { email: 'customer2@demo.local', password: 'Demo123!', name: 'Demo Customer Two' },
  ];
  for (const c of demoCustomers) {
    const existing = await customerRepo.findOne({ where: { email: c.email } });
    if (!existing) {
      const hash = await bcrypt.hash(c.password, 10);
      await customerRepo.save(
        customerRepo.create({
          email: c.email,
          passwordHash: hash,
          name: c.name,
        }),
      );
      console.log('Seeded demo customer:', c.email);
    }
  }

  console.log('DB setup completed.');
  await dataSource.destroy();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
