import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('products')
export class ProductsController {
  constructor(private service: ProductsService) {}

  @Public()
  @Get()
  async findAll(
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.findAll({ categoryId, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined });
  }

  @Public()
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
