import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AdminUser } from '../../entities/admin-user.entity';
import { Category } from '../../entities/category.entity';
import { HeroSlide } from '../../entities/hero-slide.entity';

const DEFAULT_ADMINS = [
  { email: 'admin@naturesecret.com', password: 'Admin123!', role: 'admin' as const },
  { email: 'staff@naturesecret.com', password: 'Staff123!', role: 'staff' as const },
];

const DEFAULT_CATEGORIES = [
  { name: 'Skin care', slug: 'skin-care' },
  { name: 'Herbal oil', slug: 'herbal-oil' },
];

const DEFAULT_HERO_SLIDES = [
  { imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=1200', alt: 'Premium herbal oil for pain relief', title: 'Pain care oils', href: '/shop?category=herbal-oil', sortOrder: 0 },
  { imageUrl: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1200', alt: 'Natural herbal blends', title: 'Herbal oil', href: '/shop?category=herbal-oil', sortOrder: 1 },
  { imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200', alt: 'Natural ingredients for wellness', title: 'Natural relief', href: '/shop?category=herbal-oil', sortOrder: 2 },
];

@Injectable()
export class SetupService {
  constructor(
    @InjectRepository(AdminUser) private adminRepo: Repository<AdminUser>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(HeroSlide) private slideRepo: Repository<HeroSlide>,
  ) {}

  async seedAdminIfEmpty(): Promise<{ ok: boolean; created: number }> {
    const count = await this.adminRepo.count();
    if (count > 0) return { ok: true, created: 0 };
    let created = 0;
    for (const a of DEFAULT_ADMINS) {
      const existing = await this.adminRepo.findOne({ where: { email: a.email } });
      if (!existing) {
        const hash = await bcrypt.hash(a.password, 10);
        await this.adminRepo.save(
          this.adminRepo.create({ email: a.email, passwordHash: hash, role: a.role }),
        );
        created++;
      }
    }
    return { ok: true, created };
  }

  async seedCategoriesAndSlidesIfEmpty(): Promise<{ ok: boolean; categoriesCreated: number; slidesCreated: number }> {
    let categoriesCreated = 0;
    const categoryCount = await this.categoryRepo.count();
    if (categoryCount === 0) {
      for (const c of DEFAULT_CATEGORIES) {
        await this.categoryRepo.save(this.categoryRepo.create(c));
        categoriesCreated++;
      }
    }
    let slidesCreated = 0;
    const slideCount = await this.slideRepo.count();
    if (slideCount === 0) {
      for (let i = 0; i < DEFAULT_HERO_SLIDES.length; i++) {
        await this.slideRepo.save(this.slideRepo.create(DEFAULT_HERO_SLIDES[i]));
        slidesCreated++;
      }
    }
    return { ok: true, categoriesCreated, slidesCreated };
  }
}
