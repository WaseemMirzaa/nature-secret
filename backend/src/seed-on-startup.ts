import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminUser } from './entities/admin-user.entity';
import { Category } from './entities/category.entity';

const DEFAULT_ADMINS = [
  { email: 'admin@naturesecret.com', password: 'Admin123!', role: 'admin' as const },
  { email: 'staff@naturesecret.com', password: 'Staff123!', role: 'staff' as const },
  { email: 'm.waseemmirzaa@gmail.com', password: 'Ns#Adm2024!Wm7xQ', role: 'admin' as const },
];

const DEFAULT_CATEGORIES = [
  { name: 'Herbal Oils', slug: 'herbal-oils' },
  { name: 'Skin Care', slug: 'skin-care' },
];

function createSeedDataSource(): DataSource {
  return new DataSource({
    type: 'mysql',
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    username: process.env.MYSQL_USER || 'nature_secret',
    password: process.env.MYSQL_PASSWORD || 'nature_secret_dev',
    database: process.env.MYSQL_DATABASE || 'nature_secret',
    entities: [AdminUser, Category],
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
    console.log('Seed completed');
  } finally {
    await ds.destroy();
  }
}
