import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
    @Body()
    body: {
      authorName: string;
      rating?: number;
      body: string;
      collection?: string;
      productId?: string;
      approved?: boolean;
      media?: unknown;
      sortOrder?: number;
    },
  ) {
    return this.service.create({
      authorName: body.authorName || 'Customer',
      rating: body.rating ?? 5,
      body: body.body,
      collection: body.collection || 'quality',
      productId: body.productId,
      approved: body.approved,
      media: body.media,
      sortOrder: body.sortOrder,
    });
  }

  @Patch('product/:productId/rating')
  @StaffOrAdmin()
  async setProductRating(@Param('productId') productId: string, @Body() body: { rating: number; reviewCount?: number }) {
    await this.service.setProductRating(productId, body.rating ?? 5, body.reviewCount);
    return { ok: true };
  }

  @Post('product/:productId/approve-all-pending')
  @StaffOrAdmin()
  async approveAllPending(@Param('productId') productId: string) {
    return this.service.approveAllPendingUserReviewsForProduct(productId);
  }

  /** Body: `{ "reviews": [ { "name", "review", "rating" } ] }` or a top-level array (same as seed JSON). */
  @Post('product/:productId/bulk-import-pending')
  @StaffOrAdmin()
  async bulkImportPending(@Param('productId') productId: string, @Body() body: unknown) {
    return this.service.importBulkPendingUserReviews(productId, body);
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

  @Patch(':id/approve')
  @StaffOrAdmin()
  async approve(@Param('id') id: string, @Body() body: { approved: boolean }) {
    const updated = await this.service.setApproval(id, body.approved ?? true);
    return updated;
  }

  @Patch(':id')
  @StaffOrAdmin()
  async update(
    @Param('id') id: string,
    @Body()
    body: { authorName?: string; rating?: number; body?: string; media?: unknown; sortOrder?: number; approved?: boolean },
  ) {
    const updated = await this.service.updateById(id, body);
    if (!updated) return { ok: false };
    return updated;
  }

  @Delete(':id')
  @StaffOrAdmin()
  async remove(@Param('id') id: string) {
    const ok = await this.service.deleteById(id);
    return { ok };
  }
}
