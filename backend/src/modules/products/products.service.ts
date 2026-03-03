import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Product } from '../../entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(@InjectRepository(Product) private repo: Repository<Product>) {}

  async findAll(params: { categoryId?: string; page?: number; limit?: number }): Promise<{ data: Product[]; total: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const where: FindOptionsWhere<Product> = {};
    if (params.categoryId) where.categoryId = params.categoryId;
    const [data, total] = await this.repo.findAndCount({
      where,
      relations: ['variants'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.repo.findOne({ where: { slug }, relations: ['variants', 'category'] });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.repo.findOne({ where: { id }, relations: ['variants', 'category'] });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
