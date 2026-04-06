import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ReviewsService } from '../reviews/reviews.service';
import { Public } from '../../common/decorators/public.decorator';

function stripCost(p: any) {
  if (!p) return p;
  const { manufacturingCost, boxPrice, stickerPrice, ...rest } = p;
  return rest;
}

function wantsReviews(q: string | undefined): boolean {
  return q === 'true' || q === '1' || q === 'yes';
}

@Controller('products')
export class ProductsController {
  constructor(
    private service: ProductsService,
    private reviewsService: ReviewsService,
  ) {}

  @Public()
  @Get()
  async findAll(
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const res = await this.service.findAll({ categoryId, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined });
    return { ...res, data: res.data.map(stripCost) };
  }

  @Public()
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string, @Query('includeReviews') includeReviews?: string) {
    const product = stripCost(await this.service.findBySlug(slug));
    if (!wantsReviews(includeReviews)) return product;
    const reviews = await this.reviewsService.findByProductId(product.id);
    return { ...product, reviews };
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string, @Query('includeReviews') includeReviews?: string) {
    const product = stripCost(await this.service.findOne(id));
    if (!wantsReviews(includeReviews)) return product;
    const reviews = await this.reviewsService.findByProductId(product.id);
    return { ...product, reviews };
  }
}
