import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AdminUser } from './entities/admin-user.entity';
import { Category } from './entities/category.entity';
import { HeroSlide } from './entities/hero-slide.entity';

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

export async function seedAdminAndCategoriesIfEmpty(dataSource: DataSource): Promise<void> {
  console.log('Starting seed (admin + staff if none exist)...');
  const adminRepo = dataSource.getRepository(AdminUser);
  const categoryRepo = dataSource.getRepository(Category);

  let adminCount = 0;
  try {
    adminCount = await adminRepo.count();
  } catch (e) {
    console.error('Seed: admin count failed', e?.message || e);
    return;
  }
  console.log('Seed: admin_users count =', adminCount);

  if (adminCount === 0) {
    for (const a of DEFAULT_ADMINS) {
      try {
        const hash = await bcrypt.hash(a.password, 10);
        await adminRepo.save(
          adminRepo.create({ email: a.email, passwordHash: hash, role: a.role }),
        );
        console.log('Seeded admin:', a.email, `(${a.role})`);
      } catch (e) {
        console.error('Seed: repo save failed for', a.email, e?.message || e);
        try {
          const hash = await bcrypt.hash(a.password, 10);
          await dataSource.query(
            'INSERT INTO admin_users (id, email, passwordHash, role, twoFactorEnabled) VALUES (UUID(), ?, ?, ?, 0)',
            [a.email, hash, a.role],
          );
          console.log('Seeded admin (raw):', a.email, `(${a.role})`);
        } catch (rawE) {
          console.error('Seed: raw insert failed for', a.email, rawE?.message || rawE);
        }
      }
    }
  } else {
    for (const a of DEFAULT_ADMINS) {
      const existing = await adminRepo.findOne({ where: { email: a.email } });
      if (!existing) {
        try {
          const hash = await bcrypt.hash(a.password, 10);
          await adminRepo.save(
            adminRepo.create({ email: a.email, passwordHash: hash, role: a.role }),
          );
          console.log('Seeded admin:', a.email, `(${a.role})`);
        } catch (e) {
          console.error('Seed: save failed for', a.email, e?.message || e);
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

  const slideRepo = dataSource.getRepository(HeroSlide);
  const slideCount = await slideRepo.count();
  if (slideCount === 0) {
    for (let i = 0; i < DEFAULT_HERO_SLIDES.length; i++) {
      await slideRepo.save(slideRepo.create(DEFAULT_HERO_SLIDES[i]));
    }
    console.log('Seeded hero slides:', DEFAULT_HERO_SLIDES.length);
  }

  console.log('Seed completed');
}
