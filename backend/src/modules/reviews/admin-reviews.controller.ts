import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt.guard';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';
import { StaffOrAdmin } from '../../common/decorators/admin.decorator';

@Controller('admin/reviews')
@UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
export class AdminReviewsController {
  constructor(private service: ReviewsService) {}

  @Get()
  @StaffOrAdmin()
  async list(@Query('productId') productId?: string, @Query('collection') collection?: string) {
    return this.service.findForAdmin({ productId: productId || undefined, collection: collection || undefined });
  }

  @Post()
  @StaffOrAdmin()
  async create(
    @Body() body: { authorName: string; rating?: number; body: string; collection?: string; productId?: string },
  ) {
    return this.service.create({
      authorName: body.authorName || 'Customer',
      rating: body.rating ?? 5,
      body: body.body,
      collection: body.collection || 'quality',
      productId: body.productId,
    });
  }

  @Patch(':id/assign')
  @StaffOrAdmin()
  async assign(@Param('id') id: string, @Body() body: { productId: string }) {
    return this.service.assignToProduct(id, body.productId);
  }

  @Patch(':id/unassign')
  @StaffOrAdmin()
  async unassign(@Param('id') id: string) {
    return this.service.removeFromProduct(id);
  }

  @Patch('product/:productId/rating')
  @StaffOrAdmin()
  async setProductRating(@Param('productId') productId: string, @Body() body: { rating: number; reviewCount?: number }) {
    await this.service.setProductRating(productId, body.rating ?? 5, body.reviewCount);
    return { ok: true };
  }

  @Patch(':id/approve')
  @StaffOrAdmin()
  async approve(@Param('id') id: string, @Body() body: { approved: boolean }) {
    const updated = await this.service.setApproval(id, body.approved ?? true);
    return updated;
  }
}
