import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminUser } from './entities/admin-user.entity';
import { Category } from './entities/category.entity';
import { HeroSlide } from './entities/hero-slide.entity';

const DEFAULT_ADMINS = [
  { email: 'admin@naturesecret.com', password: 'Admin123!', role: 'admin' as const },
  { email: 'staff@naturesecret.com', password: 'Staff123!', role: 'staff' as const },
  { email: 'm.waseemmirzaa@gmail.com', password: 'Ns#Adm2024!Wm7xQ', role: 'admin' as const },
];

const DEFAULT_CATEGORIES = [
  { name: 'Herbal Oils', slug: 'herbal-oils' },
  { name: 'Skin Care', slug: 'skin-care' },
];

const DEFAULT_HERO_SLIDES = [
  { imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=1200', alt: 'Premium herbal oils for pain relief', title: 'Pain care oils', href: '/shop?category=herbal-oils', sortOrder: 0 },
  { imageUrl: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1200', alt: 'Natural herbal blends', title: 'Herbal oils', href: '/shop?category=herbal-oils', sortOrder: 1 },
  { imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200', alt: 'Natural ingredients for wellness', title: 'Natural relief', href: '/shop?category=herbal-oils', sortOrder: 2 },
  { imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200', alt: 'Skincare serums and care', title: 'Skincare', href: '/shop?category=skin-care', sortOrder: 3 },
  { imageUrl: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1200', alt: 'Premium skincare routine', title: 'Skin care', href: '/shop?category=skin-care', sortOrder: 4 },
  { imageUrl: 'https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?w=1200', alt: 'Clean skincare products', title: 'Coming soon', href: '/shop?category=skin-care', sortOrder: 5 },
];

function createSeedDataSource(): DataSource {
  return new DataSource({
    type: 'mysql',
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    username: process.env.MYSQL_USER || 'nature_secret',
    password: process.env.MYSQL_PASSWORD || 'nature_secret_dev',
    database: process.env.MYSQL_DATABASE || 'nature_secret',
    entities: [AdminUser, Category, HeroSlide],
    synchronize: false,
    charset: 'utf8mb4',
  });
}

export async function seedAdminAndCategoriesIfEmpty(): Promise<void> {
  const ds = createSeedDataSource();
  await ds.initialize();
  try {
    console.log('Starting seed...');
    const adminRepo = ds.getRepository(AdminUser);
    const categoryRepo = ds.getRepository(Category);

    for (const a of DEFAULT_ADMINS) {
      const existing = await adminRepo.findOne({ where: { email: a.email } });
      if (!existing) {
        const hash = await bcrypt.hash(a.password, 10);
        await adminRepo.save(
          adminRepo.create({ email: a.email, passwordHash: hash, role: a.role }),
        );
        console.log('Seeded admin:', a.email);
      } else {
        console.log('Admin exists:', a.email);
      }
    }

    const categoryCount = await categoryRepo.count();
    if (categoryCount === 0) {
      for (const c of DEFAULT_CATEGORIES) {
        await categoryRepo.save(categoryRepo.create(c));
      }
      console.log('Seeded categories:', DEFAULT_CATEGORIES.map((c) => c.slug).join(', '));
    } else {
      console.log('Categories already exist:', categoryCount);
    }

    const slideRepo = ds.getRepository(HeroSlide);
    const slideCount = await slideRepo.count();
    if (slideCount === 0) {
      for (let i = 0; i < DEFAULT_HERO_SLIDES.length; i++) {
        await slideRepo.save(slideRepo.create(DEFAULT_HERO_SLIDES[i]));
      }
      console.log('Seeded hero slides:', DEFAULT_HERO_SLIDES.length);
    }

    console.log('Seed completed');
  } finally {
    await ds.destroy();
  }
}
