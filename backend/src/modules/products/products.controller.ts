import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Public } from '../../common/decorators/public.decorator';

function stripCost(p: any) {
  if (!p) return p;
  const { manufacturingCost, boxPrice, stickerPrice, ...rest } = p;
  return rest;
}

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
    const res = await this.service.findAll({ categoryId, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined });
    return { ...res, data: res.data.map(stripCost) };
  }

  @Public()
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return stripCost(await this.service.findBySlug(slug));
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return stripCost(await this.service.findOne(id));
  }
}
