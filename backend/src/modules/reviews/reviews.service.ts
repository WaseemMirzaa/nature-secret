import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { Review } from '../../entities/review.entity';
import { Product } from '../../entities/product.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
  ) {}

  async findByProductId(productId: string): Promise<Review[]> {
    const live = await this.reviewRepo.find({
      where: { productId, approved: true, collection: 'live' },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
    const user = await this.reviewRepo.find({
      where: { productId, approved: true, collection: 'user' },
      order: { createdAt: 'DESC' },
    });
    return [...live, ...user];
  }

  async findHighlights(limit = 12): Promise<Review[]> {
    return this.reviewRepo.find({
      // Homepage highlights should come from real product reviews only.
      where: { approved: true, productId: Not(IsNull()), collection: 'user' },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findForAdmin(params: { productId?: string; collection?: string }): Promise<Review[]> {
    const qb = this.reviewRepo.createQueryBuilder('r');
    if (params.productId != null && params.productId !== '') {
      qb.andWhere('r.productId = :productId', { productId: params.productId });
    } else {
      qb.andWhere('r.productId IS NULL');
    }
    if (params.collection) {
      qb.andWhere('r.collection = :collection', { collection: params.collection });
    }
    return qb.orderBy('r.createdAt', 'DESC').getMany();
  }

  private normalizeVideoSources(raw: unknown): Array<{ url: string; height?: number; label?: string }> | undefined {
    if (!raw || !Array.isArray(raw)) return undefined;
    const out: Array<{ url: string; height?: number; label?: string }> = [];
    for (const s of raw.slice(0, 6)) {
      if (!s || typeof s !== 'object') continue;
      const url = String((s as { url?: string }).url || '').trim();
      if (!url || url.length > 2000) continue;
      const h = Number((s as { height?: number }).height);
      const label =
        typeof (s as { label?: string }).label === 'string' ? String((s as { label: string }).label).slice(0, 48) : undefined;
      const row: { url: string; height?: number; label?: string } = { url };
      if (Number.isFinite(h) && h > 0) row.height = h;
      if (label) row.label = label;
      out.push(row);
    }
    return out.length ? out : undefined;
  }

  normalizeMedia(
    raw: unknown,
    maxItems = 8,
  ): Array<{
    type: 'image' | 'video';
    url: string;
    height?: number;
    label?: string;
    sources?: Array<{ url: string; height?: number; label?: string }>;
  }> | null {
    if (!raw || !Array.isArray(raw)) return null;
    const out: Array<{
      type: 'image' | 'video';
      url: string;
      height?: number;
      label?: string;
      sources?: Array<{ url: string; height?: number; label?: string }>;
    }> = [];
    for (const item of raw.slice(0, maxItems)) {
      if (!item || typeof item !== 'object') continue;
      const url = String((item as { url?: string }).url || '').trim();
      if (!url || url.length > 2000) continue;
      const looksVideo = /\.(mp4|webm|ogg|m3u8|mov)(\?|$)/i.test(url);
      let t: 'image' | 'video' = (item as { type?: string }).type === 'video' ? 'video' : 'image';
      if (looksVideo) t = 'video';
      const sources = t === 'video' ? this.normalizeVideoSources((item as { sources?: unknown }).sources) : undefined;
      const mainHeight = Number((item as { height?: number }).height);
      const mainLabel =
        typeof (item as { label?: string }).label === 'string'
          ? String((item as { label: string }).label).slice(0, 48)
          : undefined;
      const row: {
        type: 'image' | 'video';
        url: string;
        height?: number;
        label?: string;
        sources?: Array<{ url: string; height?: number; label?: string }>;
      } = { type: t, url };
      if (Number.isFinite(mainHeight) && mainHeight > 0) row.height = mainHeight;
      if (mainLabel) row.label = mainLabel;
      if (sources?.length) row.sources = sources;
      out.push(row);
    }
    return out.length ? out : null;
  }

  async create(dto: {
    authorName: string;
    rating: number;
    body: string;
    collection: string;
    productId?: string;
    approved?: boolean;
    media?: unknown;
    sortOrder?: number;
  }): Promise<Review> {
    const review = this.reviewRepo.create({
      authorName: dto.authorName,
      rating: Math.min(5, Math.max(1, dto.rating || 5)),
      body: dto.body,
      collection: dto.collection || 'quality',
      productId: dto.productId || null,
      approved: dto.approved ?? true,
      media: this.normalizeMedia(dto.media, 8),
      sortOrder: Math.max(0, Math.min(999, Number(dto.sortOrder) || 0)),
    });
    return this.reviewRepo.save(review);
  }

  async updateById(
    id: string,
    dto: Partial<{ authorName: string; rating: number; body: string; media: unknown; sortOrder: number; approved: boolean }>,
  ): Promise<Review | null> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) return null;
    if (dto.authorName != null) review.authorName = String(dto.authorName).slice(0, 255) || review.authorName;
    if (dto.rating != null) review.rating = Math.min(5, Math.max(1, Number(dto.rating) || 5));
    if (dto.body != null) review.body = String(dto.body);
    if (dto.media !== undefined) review.media = this.normalizeMedia(dto.media);
    if (dto.sortOrder != null) review.sortOrder = Math.max(0, Math.min(999, Number(dto.sortOrder) || 0));
    if (dto.approved != null) review.approved = !!dto.approved;
    return this.reviewRepo.save(review);
  }

  async deleteById(id: string): Promise<boolean> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) return false;
    const pid = review.productId;
    await this.reviewRepo.remove(review);
    if (pid && review.collection === 'user') await this.updateProductReviewStats(pid);
    return true;
  }

  async createUserReview(dto: {
    productId: string;
    authorName: string;
    rating: number;
    body: string;
    media?: unknown;
  }): Promise<Review> {
    const review = this.reviewRepo.create({
      authorName: dto.authorName,
      rating: Math.min(5, Math.max(1, dto.rating || 5)),
      body: dto.body,
      collection: 'user',
      productId: dto.productId,
      approved: false,
      media: this.normalizeMedia(dto.media, 4),
    });
    const saved = await this.reviewRepo.save(review);
    // do not update product stats until approved
    return saved;
  }

  async assignToProduct(reviewId: string, productId: string): Promise<Review> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new Error('Review not found');
    review.productId = productId;
    await this.reviewRepo.save(review);
    await this.updateProductReviewStats(productId);
    return review;
  }

  async removeFromProduct(reviewId: string): Promise<Review> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new Error('Review not found');
    const pid = review.productId;
    review.productId = null;
    await this.reviewRepo.save(review);
    if (pid) await this.updateProductReviewStats(pid);
    return review;
  }

  async setApproval(reviewId: string, approved: boolean): Promise<Review> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new Error('Review not found');
    review.approved = !!approved;
    const saved = await this.reviewRepo.save(review);
    if (review.productId) {
      await this.updateProductReviewStats(review.productId);
    }
    return saved;
  }

  /**
   * Import many customer reviews as pending (`user`, `approved: false`).
   * Accepts `{ reviews: [...] }` or a raw array; each item: `{ name, review, rating }`.
   */
  async importBulkPendingUserReviews(productId: string, payload: unknown): Promise<{ inserted: number }> {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new BadRequestException('Product not found');

    let rows: Array<{ name?: string; review?: string; rating?: number }>;
    if (Array.isArray(payload)) {
      rows = payload;
    } else if (payload && typeof payload === 'object' && Array.isArray((payload as { reviews?: unknown }).reviews)) {
      rows = (payload as { reviews: typeof rows }).reviews;
    } else {
      throw new BadRequestException('Expected a JSON array or { "reviews": [ { "name", "review", "rating" } ] }');
    }

    const MAX = 500;
    if (rows.length > MAX) {
      throw new BadRequestException(`Maximum ${MAX} reviews per import`);
    }
    if (rows.length === 0) {
      throw new BadRequestException('No reviews to import');
    }

    let inserted = 0;
    const baseOrder = await this.reviewRepo.count({ where: { productId, collection: 'user' } });
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const authorName = String(row.name || 'Customer').slice(0, 255);
      const body = String(row.review || '').trim();
      if (!body) continue;
      const rating = Math.min(5, Math.max(1, Number(row.rating) || 5));
      const sortOrder = Math.min(999, baseOrder + inserted);
      const entity = this.reviewRepo.create({
        productId,
        authorName,
        body,
        rating,
        collection: 'user',
        approved: false,
        sortOrder,
        media: null,
      });
      await this.reviewRepo.save(entity);
      inserted += 1;
    }

    return { inserted };
  }

  /** Approve all pending `user` reviews for a product; refreshes aggregate rating/count. */
  async approveAllPendingUserReviewsForProduct(productId: string): Promise<{ approved: number }> {
    const pending = await this.reviewRepo.find({
      where: { productId, collection: 'user', approved: false },
    });
    for (const r of pending) {
      r.approved = true;
      await this.reviewRepo.save(r);
    }
    await this.updateProductReviewStats(productId);
    return { approved: pending.length };
  }

  async setProductRating(productId: string, rating: number, reviewCount?: number): Promise<void> {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) return;
    product.rating = Math.min(5, Math.max(0, rating));
    if (reviewCount != null) product.reviewCount = Math.max(0, reviewCount);
    await this.productRepo.save(product);
  }

  async updateProductReviewStats(productId: string): Promise<void> {
    const reviews = await this.reviewRepo.find({ where: { productId, approved: true, collection: 'user' } });
    const count = reviews.length;
    const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (product) {
      product.reviewCount = count;
      product.rating = Math.round(avg * 100) / 100;
      await this.productRepo.save(product);
    }
  }
}
