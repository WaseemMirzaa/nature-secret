import { Controller, Get, Post, Param, Patch, Delete, Body, Query, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ProductsService } from '../products/products.service';
import { PushService } from '../notifications/push.service';
import { CreateProductDto, UpdateProductDto } from '../products/dto/product.dto';
import { CreateBlogPostDto, UpdateBlogPostDto } from './dto/blog.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt.guard';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';
import { StaffOrAdmin, AdminOnly } from '../../common/decorators/admin.decorator';

@Controller('admin')
@UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
export class AdminController {
  constructor(
    private service: AdminService,
    private productsService: ProductsService,
    private pushService: PushService,
  ) {}

  @Get('dashboard')
  @AdminOnly()
  async dashboard(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.service.getDashboard({ dateFrom, dateTo });
  }

  @Get('orders/same-day/:id')
  @StaffOrAdmin()
  async ordersSameDay(@Param('id') id: string) {
    return this.service.getOrdersSameDay(id);
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
    @Query('groupBy') groupBy?: string,
  ) {
    return this.service.getOrders({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      search,
      dateFrom,
      dateTo,
      groupBy,
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
  @AdminOnly()
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
  @AdminOnly()
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
  @AdminOnly()
  async customer(@Param('id') id: string) {
    return this.service.getCustomer(id);
  }

  @Patch('customers/:id/block')
  @AdminOnly()
  async setCustomerBlock(@Param('id') id: string, @Body('blocked') blocked: boolean) {
    return this.service.setCustomerBlocked(id, !!blocked);
  }

  @Get('push/vapid-public')
  @AdminOnly()
  async getVapidPublic() {
    const key = this.pushService.getVapidPublicKey();
    return { vapidPublicKey: key };
  }

  @Post('push/subscribe')
  @AdminOnly()
  async pushSubscribe(@Body() body: { subscription: { endpoint: string; keys: { p256dh: string; auth: string }; label?: string } }) {
    if (!body?.subscription?.endpoint || !body?.subscription?.keys?.p256dh || !body?.subscription?.keys?.auth) {
      return { ok: false };
    }
    this.pushService.addSubscription(body.subscription);
    return { ok: true };
  }

  @Post('products')
  @AdminOnly()
  async createProduct(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch('products/:id')
  @AdminOnly()
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete('products/:id')
  @AdminOnly()
  async deleteProduct(@Param('id') id: string) {
    await this.productsService.remove(id);
    return { deleted: true };
  }

  @Get('blog')
  @AdminOnly()
  async blog(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.getBlogPosts({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('blog')
  @AdminOnly()
  async createBlogPost(@Body() dto: CreateBlogPostDto) {
    return this.service.createBlogPost(dto);
  }

  @Patch('blog/:id')
  @AdminOnly()
  async updateBlogPost(@Param('id') id: string, @Body() dto: UpdateBlogPostDto) {
    return this.service.updateBlogPost(id, dto);
  }

  @Delete('blog/:id')
  @AdminOnly()
  async deleteBlogPost(@Param('id') id: string) {
    return this.service.deleteBlogPost(id);
  }
}
