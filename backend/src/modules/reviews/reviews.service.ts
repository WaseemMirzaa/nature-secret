import { Injectable } from '@nestjs/common';
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

  normalizeMedia(raw: unknown, maxItems = 8): Array<{ type: 'image' | 'video'; url: string }> | null {
    if (!raw || !Array.isArray(raw)) return null;
    const out: Array<{ type: 'image' | 'video'; url: string }> = [];
    for (const item of raw.slice(0, maxItems)) {
      if (!item || typeof item !== 'object') continue;
      const url = String((item as { url?: string }).url || '').trim();
      if (!url || url.length > 2000) continue;
      const t = (item as { type?: string }).type === 'video' ? 'video' : 'image';
      out.push({ type: t, url });
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
