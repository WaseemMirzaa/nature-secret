import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../entities/review.entity';
import { Product } from '../../entities/product.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
  ) {}

  async findByProductId(productId: string): Promise<Review[]> {
    return this.reviewRepo.find({
      where: { productId },
      order: { createdAt: 'DESC' },
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

  async create(dto: { authorName: string; rating: number; body: string; collection: string; productId?: string }): Promise<Review> {
    const review = this.reviewRepo.create({
      authorName: dto.authorName,
      rating: Math.min(5, Math.max(1, dto.rating || 5)),
      body: dto.body,
      collection: dto.collection || 'quality',
      productId: dto.productId || null,
    });
    return this.reviewRepo.save(review);
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

  async setProductRating(productId: string, rating: number, reviewCount?: number): Promise<void> {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) return;
    product.rating = Math.min(5, Math.max(0, rating));
    if (reviewCount != null) product.reviewCount = Math.max(0, reviewCount);
    await this.productRepo.save(product);
  }

  async updateProductReviewStats(productId: string): Promise<void> {
    const reviews = await this.reviewRepo.find({ where: { productId } });
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
