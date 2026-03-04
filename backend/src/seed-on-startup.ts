import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminUser } from './entities/admin-user.entity';
import { Category } from './entities/category.entity';

const DEFAULT_ADMINS = [
  { email: 'admin@naturesecret.com', password: 'Admin123!', role: 'admin' as const },
  { email: 'staff@naturesecret.com', password: 'Staff123!', role: 'staff' as const },
];

const DEFAULT_CATEGORIES = [
  { name: 'Herbal Oils', slug: 'herbal-oils' },
  { name: 'Skin Care', slug: 'skin-care' },
];

export async function seedAdminAndCategoriesIfEmpty(dataSource: DataSource): Promise<void> {
  const adminRepo = dataSource.getRepository(AdminUser);
  const categoryRepo = dataSource.getRepository(Category);

  for (const a of DEFAULT_ADMINS) {
    const existing = await adminRepo.findOne({ where: { email: a.email } });
    if (!existing) {
      await adminRepo.save(
        adminRepo.create({
          email: a.email,
          passwordHash: await bcrypt.hash(a.password, 10),
          role: a.role,
        }),
      );
      console.log('Seeded admin:', a.email);
    }
  }

  const categoryCount = await categoryRepo.count();
  if (categoryCount === 0) {
    for (const c of DEFAULT_CATEGORIES) {
      await categoryRepo.save(categoryRepo.create(c));
    }
    console.log('Seeded categories:', DEFAULT_CATEGORIES.map((c) => c.slug).join(', '));
  }
}
