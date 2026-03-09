import { Controller, Get, Query } from '@nestjs/common';
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
}
