import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Category } from '../../entities/category.entity';
import { Product } from '../../entities/product.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category) private repo: Repository<Category>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
  ) {}

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

  private normalizeSlug(raw: string): string {
    return String(raw || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async create(dto: { name: string; slug: string }): Promise<Category> {
    const name = String(dto.name || '').trim();
    const slug = this.normalizeSlug(dto.slug);
    if (!name) throw new BadRequestException('name is required');
    if (!slug) throw new BadRequestException('slug is invalid');
    const exists = await this.repo.findOne({ where: { slug } });
    if (exists) throw new ConflictException('A category with this slug already exists');
    const row = this.repo.create({ name, slug });
    const saved = await this.repo.save(row);
    return (await this.ensureAdvertisingId(saved)) as Category;
  }

  async update(id: string, dto: { name?: string; slug?: string }): Promise<Category> {
    if (dto.name === undefined && dto.slug === undefined) {
      throw new BadRequestException('Provide name and/or slug to update');
    }
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Category not found');
    if (dto.name !== undefined) {
      const name = String(dto.name || '').trim();
      if (!name) throw new BadRequestException('name cannot be empty');
      row.name = name;
    }
    if (dto.slug !== undefined) {
      const slug = this.normalizeSlug(dto.slug);
      if (!slug) throw new BadRequestException('slug is invalid');
      if (slug !== row.slug) {
        const taken = await this.repo.findOne({ where: { slug } });
        if (taken && taken.id !== id) throw new ConflictException('A category with this slug already exists');
        row.slug = slug;
      }
    }
    await this.repo.save(row);
    return (await this.ensureAdvertisingId(await this.repo.findOne({ where: { id } }))) as Category;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Category not found');
    const n = await this.productRepo.count({ where: { categoryId: id } });
    if (n > 0) {
      throw new BadRequestException(`Cannot delete: ${n} product(s) still use this category. Reassign them first.`);
    }
    await this.repo.delete({ id });
    return { deleted: true };
  }
}
