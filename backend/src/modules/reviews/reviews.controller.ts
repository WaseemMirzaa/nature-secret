import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private service: ReviewsService) {}

  @Public()
  @Get()
  async list(@Query('productId') productId: string) {
    if (!productId) return [];
    return this.service.findByProductId(productId);
  }

  @Public()
  @Post()
  async create(@Body() body: { productId: string; authorName?: string; rating?: number; body: string }) {
    if (!body?.productId || !body?.body) return { ok: false };
    const review = await this.service.createUserReview({
      productId: body.productId,
      authorName: body.authorName || 'Customer',
      rating: body.rating ?? 5,
      body: body.body,
    });
    return { ok: true, id: review.id };
  }
}
