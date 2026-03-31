import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Category } from '../../entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(@InjectRepository(Category) private repo: Repository<Category>) {}

  private makeRandomAdvertisingId() {
    return `c_${crypto.randomBytes(6).toString('hex')}`;
  }

  private async ensureAdvertisingId(category: Category | null): Promise<Category | null> {
    if (!category) return null;
    if (category.advertisingId) return category;
    let next = this.makeRandomAdvertisingId();
    for (let i = 0; i < 6; i += 1) {
      const exists = await this.repo.findOne({ where: { advertisingId: next } });
      if (!exists) break;
      next = this.makeRandomAdvertisingId();
    }
    category.advertisingId = next;
    await this.repo.save(category);
    return category;
  }

  async findAll(): Promise<Category[]> {
    const rows = await this.repo.find({ order: { name: 'ASC' } });
    const updated = await Promise.all(rows.map((r) => this.ensureAdvertisingId(r)));
    return updated.filter(Boolean) as Category[];
  }

  async findOne(id: string): Promise<Category | null> {
    return this.ensureAdvertisingId(await this.repo.findOne({ where: { id } }));
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.ensureAdvertisingId(await this.repo.findOne({ where: { slug } }));
  }
}
