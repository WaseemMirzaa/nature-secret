import { Controller, Get, Param, Query } from '@nestjs/common';
import { BlogService } from './blog.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('blog')
export class BlogController {
  constructor(private service: BlogService) {}

  @Public()
  @Get('posts')
  async list(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.service.findPublished({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Public()
  @Get('posts/slug/:slug')
  async bySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  @Public()
  @Get('posts/:id')
  async one(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
