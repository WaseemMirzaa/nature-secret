import { Controller, Get, Param, Patch, Body, Query, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt.guard';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';
import { StaffOrAdmin } from '../../common/decorators/admin.decorator';

@Controller('admin')
@UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
export class AdminController {
  constructor(private service: AdminService) {}

  @Get('dashboard')
  async dashboard() {
    return this.service.getDashboard();
  }

  @Get('orders')
  @StaffOrAdmin()
  async orders(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getOrders({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      search,
      dateFrom,
      dateTo,
    });
  }

  @Get('orders/:id')
  @StaffOrAdmin()
  async order(@Param('id') id: string) {
    return this.service.getOrder(id);
  }

  @Patch('orders/:id/status')
  @StaffOrAdmin()
  async updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Req() req: { user: { role: string } },
  ) {
    const changedBy = req.user.role === 'staff' ? 'staff' : 'admin';
    return this.service.updateOrderStatus(id, status, changedBy);
  }

  @Get('products')
  async products(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.service.getProducts({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Get('customers')
  async customers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.service.getCustomers({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Get('customers/:id')
  async customer(@Param('id') id: string) {
    return this.service.getCustomer(id);
  }

  @Get('blog')
  async blog(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.getBlogPosts({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
