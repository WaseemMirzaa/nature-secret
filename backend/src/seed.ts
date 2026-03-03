import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminUser } from './entities/admin-user.entity';
import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  username: process.env.MYSQL_USER || 'nature_secret',
  password: process.env.MYSQL_PASSWORD || 'nature_secret_dev',
  database: process.env.MYSQL_DATABASE || 'nature_secret',
  entities: [AdminUser, Category, Product, ProductVariant],
  synchronize: false,
});

async function seed() {
  await dataSource.initialize();
  const adminRepo = dataSource.getRepository(AdminUser);
  const categoryRepo = dataSource.getRepository(Category);
  const productRepo = dataSource.getRepository(Product);
  const variantRepo = dataSource.getRepository(ProductVariant);

  const admins = [
    { email: 'admin@naturesecret.com', password: 'Admin123!', role: 'admin' as const },
    { email: 'staff@naturesecret.com', password: 'Staff123!', role: 'staff' as const },
  ];
  for (const a of admins) {
    const existing = await adminRepo.findOne({ where: { email: a.email } });
    if (!existing) {
      await adminRepo.save(
        adminRepo.create({ email: a.email, passwordHash: await bcrypt.hash(a.password, 10), role: a.role }),
      );
      console.log('Seeded admin:', a.email);
    }
  }
  if ((await adminRepo.count()) > 0) console.log('Admin users ready.');

  if ((await categoryRepo.count()) === 0) {
    await categoryRepo.save([
      categoryRepo.create({ name: 'Herbal Oils', slug: 'herbal-oils' }),
      categoryRepo.create({ name: 'Skin Care', slug: 'skin-care' }),
    ]);
    console.log('Seeded categories.');
  }

  if ((await productRepo.count()) === 0) {
    const cats = await categoryRepo.find();
    const herbalId = cats.find((c) => c.slug === 'herbal-oils')?.id;
    const skinId = cats.find((c) => c.slug === 'skin-care')?.id;
    if (herbalId) {
      const p = productRepo.create({
        name: 'Painrex Oil',
        slug: 'painrex-oil',
        categoryId: herbalId,
        badge: 'Bestseller',
        badgeSub: 'Top selling',
        price: 49900,
        description: 'Fast pain relief herbal oil for muscle, bones & joint pain. Nature Secret premium formulation.',
        benefits: ['Muscle pain', 'Joint pain', 'Arthritis & back pain', 'Neck & knee pain', '50 ml'],
        images: ['/assets/painrex-oil-main.png'],
        rating: 4.8,
        reviewCount: 0,
        inventory: 100,
        isBestseller: true,
        outOfStock: false,
        faq: [{ q: 'Where to use?', a: 'Muscle pain, joint pain, arthritis, back pain, neck pain, knee pain.' }, { q: 'How to apply?', a: 'Apply a few drops to the affected area and massage gently.' }],
      });
      await productRepo.save(p);
      await variantRepo.save([
        variantRepo.create({ productId: p.id, name: '50 ml', volume: '50ml', price: 49900, image: '/assets/painrex-oil-main.png' }),
        variantRepo.create({ productId: p.id, name: '100 ml', volume: '100ml', price: 89900, image: '/assets/painrex-oil-main.png' }),
      ]);
    }
    console.log('Seeded products.');
  }

  await dataSource.destroy();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
