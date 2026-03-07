import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SliderService } from './slider.service';
import { CreateSlideDto, UpdateSlideDto } from './dto/slide.dto';
import { Public } from '../../common/decorators/public.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt.guard';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';
import { StaffOrAdmin } from '../../common/decorators/admin.decorator';

@Controller('slider')
export class SliderController {
  constructor(private service: SliderService) {}

  @Public()
  @Get()
  async getSlides() {
    return this.service.findAll();
  }

  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
  @StaffOrAdmin()
  @Get('admin')
  async adminGetSlides() {
    return this.service.findAll();
  }

  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
  @StaffOrAdmin()
  @Post()
  async create(@Body() dto: CreateSlideDto) {
    return this.service.create(dto);
  }

  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
  @StaffOrAdmin()
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSlideDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
  @StaffOrAdmin()
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const ok = await this.service.remove(id);
    return { deleted: ok };
  }
}
