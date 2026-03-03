import { Controller, Get, Param } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private service: CategoriesService) {}

  @Public()
  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
