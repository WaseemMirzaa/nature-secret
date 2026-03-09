import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

function normalizeImageUrl(u: string | undefined): string {
  if (!u || typeof u !== 'string') return u ?? '';
  return u.startsWith('http') ? u.replace(/^(https?:\/\/[^/]+)(\/.*)$/, (_, o, p) => o + p.replace(/\/+/g, '/')) : u.replace(/\/+/g, '/');
}

function normalizeProductImages(p: Product): Product {
  if (Array.isArray(p.images) && p.images.length) {
    p.images = p.images.map(normalizeImageUrl);
  }
  return p;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product) private repo: Repository<Product>,
    @InjectRepository(ProductVariant) private variantRepo: Repository<ProductVariant>,
  ) {}

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
    return { data: data.map(normalizeProductImages), total };
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.repo.findOne({ where: { slug }, relations: ['variants', 'category'] });
    if (!product) throw new NotFoundException('Product not found');
    return normalizeProductImages(product);
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.repo.findOne({ where: { id }, relations: ['variants', 'category'] });
    if (!product) throw new NotFoundException('Product not found');
    return normalizeProductImages(product);
  }

  async create(dto: CreateProductDto): Promise<Product> {
    this.logger.log(`Product create requested: name=${dto.name} slug=${dto.slug} categoryId=${dto.categoryId}`);
    const { variants, ...productData } = dto;
    const product = this.repo.create(productData);
    const saved = await this.repo.save(product);
    this.logger.log(`Product saved to DB id=${saved.id}`);
    if (variants?.length) {
      const variantEntities = variants.map((v) =>
        this.variantRepo.create({ ...v, productId: saved.id }),
      );
      await this.variantRepo.save(variantEntities);
    }
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    const { variants, ...updates } = dto;
    Object.assign(product, updates);
    await this.repo.save(product);
    if (variants !== undefined) {
      await this.variantRepo.delete({ productId: id });
      if (variants.length) {
        const variantEntities = variants.map((v) =>
          this.variantRepo.create({ ...v, productId: id }),
        );
        await this.variantRepo.save(variantEntities);
      }
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    await this.variantRepo.delete({ productId: id });
    await this.repo.remove(product);
  }
}
