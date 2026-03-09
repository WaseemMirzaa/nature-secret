import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { Product } from '../../entities/product.entity';
import { Customer } from '../../entities/customer.entity';
import { BlogPost } from '../../entities/blog-post.entity';
import { BlogCategory } from '../../entities/blog-category.entity';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(BlogPost) private blogRepo: Repository<BlogPost>,
    @InjectRepository(BlogCategory) private blogCategoryRepo: Repository<BlogCategory>,
    private ordersService: OrdersService,
  ) {}

  async getOrders(params: { page?: number; limit?: number; status?: string; search?: string; dateFrom?: string; dateTo?: string }) {
    try {
      const page = Math.max(1, params.page || 1);
      const limit = Math.min(100, Math.max(1, params.limit || 50));
      const qb = this.orderRepo.createQueryBuilder('o').leftJoinAndSelect('o.items', 'items').leftJoinAndSelect('o.statusTimeline', 'timeline');
      if (params.status && params.status !== 'all') qb.andWhere('o.status = :status', { status: params.status });
      if (params.search && params.search.trim()) {
        const s = `%${params.search.trim()}%`;
        qb.andWhere('o.id LIKE :s', { s });
      }
      const from = params.dateFrom && params.dateFrom !== 'undefined' ? params.dateFrom : undefined;
      const to = params.dateTo && params.dateTo !== 'undefined' ? params.dateTo : undefined;
      if (from) qb.andWhere('o.createdAt >= :from', { from });
      if (to) qb.andWhere('o.createdAt <= :to', { to: `${to}T23:59:59` });
      const [data, total] = await qb.orderBy('o.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
      return { data, total, page, limit };
    } catch (e) {
      this.logger.warn(`getOrders failed: ${e?.message || e}. Ensure orders, order_items, order_status_timeline tables exist (TypeORM synchronize or migrations).`);
      return { data: [], total: 0, page: params.page || 1, limit: params.limit || 50 };
    }
  }

  async getOrder(id: string) {
    return this.ordersService.findOne(id);
  }

  async updateOrderStatus(orderId: string, status: string, changedBy: string) {
    return this.ordersService.updateStatus(orderId, status, changedBy);
  }

  async getProducts(params: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const qb = this.productRepo.createQueryBuilder('p').leftJoinAndSelect('p.variants', 'v');
    if (params.search) qb.andWhere('p.slug LIKE :s', { s: `%${(params.search || '').trim()}%` });
    const [data, total] = await qb.orderBy('p.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit };
  }

  async getCustomers(params: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const qb = this.customerRepo.createQueryBuilder('c');
    if (params.search) qb.andWhere('c.email LIKE :s', { s: `%${(params.search || '').trim()}%` });
    const [data, total] = await qb.orderBy('c.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit };
  }

  async getCustomer(id: string) {
    const c = await this.customerRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  async getBlogPosts(params: { page?: number; limit?: number }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    try {
      const [data, total] = await this.blogRepo.findAndCount({
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return { data, total, page, limit };
    } catch (e) {
      this.logger.error(`getBlogPosts failed: ${e?.message || e}. Check that blog_posts table exists and schema matches BlogPost entity.`);
      return { data: [], total: 0, page, limit };
    }
  }

  async createBlogPost(dto: {
    title: string;
    slug: string;
    excerpt?: string;
    body?: string;
    template?: string;
    categoryId?: string;
    image?: string;
    imageAlt?: string;
    readTimeMinutes?: number;
    publishedAt?: string;
    relatedProductIds?: string[];
    seoTitle?: string;
    seoDescription?: string;
  }) {
    const categoryId = await this.normalizeBlogCategoryId(dto.categoryId);
    const post = this.blogRepo.create({
      ...dto,
      categoryId,
      publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
    });
    return this.blogRepo.save(post);
  }

  private async normalizeBlogCategoryId(categoryId?: string | null): Promise<string | null> {
    if (!categoryId || typeof categoryId !== 'string' || !categoryId.trim()) return null;
    const id = categoryId.trim();
    const exists = await this.blogCategoryRepo.findOne({ where: { id } });
    return exists ? id : null;
  }

  async updateBlogPost(id: string, dto: Partial<{
    title: string;
    slug: string;
    excerpt: string;
    body: string;
    template: string;
    categoryId: string;
    image: string;
    imageAlt: string;
    readTimeMinutes: number;
    publishedAt: string;
    relatedProductIds: string[];
    seoTitle: string;
    seoDescription: string;
  }>) {
    const post = await this.blogRepo.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    const updates = { ...dto } as any;
    if (updates.publishedAt !== undefined) updates.publishedAt = updates.publishedAt ? new Date(updates.publishedAt) : null;
    if (updates.categoryId !== undefined) updates.categoryId = await this.normalizeBlogCategoryId(updates.categoryId);
    Object.assign(post, updates);
    return this.blogRepo.save(post);
  }

  async deleteBlogPost(id: string) {
    const post = await this.blogRepo.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    await this.blogRepo.remove(post);
    return { deleted: true };
  }

  async getDashboard() {
    try {
      const r = await this.orderRepo.createQueryBuilder('o').select('COUNT(o.id)', 'count').addSelect('COALESCE(SUM(o.total), 0)', 'sum').getRawOne();
      const orderCount = Number(r?.count || 0);
      const totalRevenue = Number(r?.sum || 0);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      const todayOrders = await this.orderRepo.createQueryBuilder('o').where('o.createdAt >= :start', { start: todayStart }).andWhere('o.createdAt < :end', { end: todayEnd }).getCount();
      return { orderCount, totalRevenue, todayOrders };
    } catch (e) {
      this.logger.warn(`getDashboard failed: ${e?.message || e}. Ensure orders table exists.`);
      return { orderCount: 0, totalRevenue: 0, todayOrders: 0 };
    }
  }
}
