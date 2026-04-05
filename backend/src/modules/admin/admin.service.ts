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

  /** Last 7 calendar days including today (local server date). */
  private defaultOrderDateRange(): { from: string; to: string } {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 6);
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return { from: fmt(from), to: fmt(to) };
  }

  async getOrders(params: { page?: number; limit?: number; status?: string; search?: string; dateFrom?: string; dateTo?: string; groupBy?: string }) {
    try {
      const page = Math.max(1, params.page || 1);
      const limit = Math.min(100, Math.max(1, params.limit || 50));
      const qb = this.orderRepo
        .createQueryBuilder('o')
        .leftJoinAndSelect('o.items', 'items')
        .leftJoinAndSelect('o.statusTimeline', 'timeline')
        .leftJoin('o.customer', 'cust');
      qb.andWhere('(o.customerId IS NULL OR cust.blocked = 0)');
      if (params.status && params.status !== 'all') {
        qb.andWhere('o.status = :status', { status: params.status });
      } else {
        qb.andWhere('o.status != :cancelled', { cancelled: 'cancelled' });
      }
      if (params.search && params.search.trim()) {
        const s = `%${params.search.trim()}%`;
        qb.andWhere('(o.id LIKE :s)', { s });
      }
      const validDate = (s: string | undefined) => s && s !== 'undefined' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined;
      let from = validDate(params.dateFrom);
      let to = validDate(params.dateTo);
      if (!from && !to) {
        const d = this.defaultOrderDateRange();
        from = d.from;
        to = d.to;
      }
      if (from) qb.andWhere('o.createdAt >= :from', { from });
      if (to) qb.andWhere('o.createdAt <= :to', { to: `${to}T23:59:59` });

      if (params.groupBy === 'customerDate') {
        const cap = 2000;
        const all = await qb.clone().orderBy('o.createdAt', 'DESC').take(cap).getMany();
        const map = new Map<string, { orders: Order[] }>();
        for (const o of all) {
          const email = (o.email || '').trim().toLowerCase();
          const dateKey = o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : '';
          const key = `${email}|${dateKey}`;
          if (!map.has(key)) map.set(key, { orders: [] });
          map.get(key)!.orders.push(o);
        }
        const groups = Array.from(map.entries()).map(([key, { orders: ords }]) => {
          const first = ords[0];
          const dateKey = key.split('|')[1] || '';
          const statusCounts: Record<string, number> = {};
          let totalAmount = 0;
          for (const o of ords) {
            statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
            totalAmount += o.total || 0;
          }
          return {
            customerName: first.customerName,
            email: first.email,
            dateKey,
            orderCount: ords.length,
            totalAmount,
            statusSummary: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
            firstOrderId: first.id,
            orderIds: ords.map((o) => o.id),
            maxCreatedAt: Math.max(...ords.map((o) => new Date(o.createdAt).getTime())),
          };
        });
        groups.sort((a, b) => (b.maxCreatedAt || 0) - (a.maxCreatedAt || 0));
        const total = groups.length;
        const data = groups.slice((page - 1) * limit, page * limit);
        return { data, total, page, limit, grouped: true };
      }

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

  /** All orders from the same customer on the same day as the given order (for order detail grouping). */
  async getOrdersSameDay(orderId: string): Promise<Order[]> {
    const order = await this.orderRepo.findOne({ where: { id: orderId }, relations: ['items', 'statusTimeline'] });
    if (!order) return [];
    const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
    const dayStart = new Date(orderDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const orders = await this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'items')
      .leftJoinAndSelect('o.statusTimeline', 'timeline')
      .where('o.createdAt >= :start', { start: dayStart })
      .andWhere('o.createdAt < :end', { end: dayEnd })
      .orderBy('o.createdAt', 'DESC')
      .getMany();
    const orderEmail = (order.email || '').trim().toLowerCase();
    return orders.filter((o) => (o.email || '').trim().toLowerCase() === orderEmail);
  }

  async updateOrderStatus(orderId: string, status: string, changedBy: string) {
    return this.ordersService.updateStatus(orderId, status, changedBy);
  }

  async notifyMetaFakePurchaseOrder(orderId: string) {
    return this.ordersService.notifyMetaFakePurchaseOrder(orderId);
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

  async setCustomerBlocked(id: string, blocked: boolean) {
    const c = await this.customerRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Customer not found');
    c.blocked = !!blocked;
    await this.customerRepo.save(c);
    if (blocked) {
      const orders = await this.orderRepo.find({ where: { customerId: id } });
      for (const order of orders) {
        if (order.status !== 'cancelled') {
          await this.ordersService.updateStatus(order.id, 'cancelled', 'system');
        }
      }
    }
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

  async getDashboard(params?: { dateFrom?: string; dateTo?: string }) {
    try {
      const validDate = (s: string | undefined) => s && s !== 'undefined' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined;
      const qb = this.orderRepo.createQueryBuilder('o').andWhere('o.status != :cancelled', { cancelled: 'cancelled' });
      const from = validDate(params?.dateFrom);
      const to = validDate(params?.dateTo);
      if (from) qb.andWhere('o.createdAt >= :from', { from });
      if (to) qb.andWhere('o.createdAt <= :to', { to: `${to}T23:59:59` });

      const r = await qb.clone().select('COUNT(o.id)', 'count').addSelect('COALESCE(SUM(o.total), 0)', 'sum').getRawOne();
      const orderCount = Number(r?.count || 0);
      const totalRevenue = Number(r?.sum || 0);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      const todayOrders = await this.orderRepo
        .createQueryBuilder('o')
        .where('o.createdAt >= :start', { start: todayStart })
        .andWhere('o.createdAt < :end', { end: todayEnd })
        .andWhere('o.status != :cancelled', { cancelled: 'cancelled' })
        .getCount();
      const revenueTodayRaw = await this.orderRepo
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.total), 0)', 'sum')
        .where('o.createdAt >= :start', { start: todayStart })
        .andWhere('o.createdAt < :end', { end: todayEnd })
        .andWhere('o.status != :cancelled', { cancelled: 'cancelled' })
        .getRawOne();
      const revenueToday = Number(revenueTodayRaw?.sum || 0);

      const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
      const byStatus: Array<{ status: string; count: number; total: number }> = [];
      for (const status of statuses) {
        const q = this.orderRepo.createQueryBuilder('o').where('o.status = :status', { status });
        if (from) q.andWhere('o.createdAt >= :from', { from });
        if (to) q.andWhere('o.createdAt <= :to', { to: `${to}T23:59:59` });
        const [count, sumRaw] = await Promise.all([q.getCount(), q.select('COALESCE(SUM(o.total), 0)', 'sum').getRawOne()]);
        byStatus.push({ status, count, total: Number(sumRaw?.sum || 0) });
      }
      return { orderCount, totalRevenue, todayOrders, revenueToday, byStatus };
    } catch (e) {
      this.logger.warn(`getDashboard failed: ${e?.message || e}. Ensure orders table exists.`);
      return { orderCount: 0, totalRevenue: 0, todayOrders: 0, revenueToday: 0, byStatus: [] };
    }
  }
}
