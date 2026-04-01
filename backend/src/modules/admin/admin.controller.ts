import { Controller, Get, Post, Param, Patch, Delete, Body, Query, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ProductsService } from '../products/products.service';
import { PushService } from '../notifications/push.service';
import { WhatsAppLinkService } from '../notifications/whatsapp-link.service';
import { SettingsService } from '../settings/settings.service';
import { SupportService } from '../support/support.service';
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
    private whatsappLink: WhatsAppLinkService,
    private settingsService: SettingsService,
    private supportService: SupportService,
  ) {}

  @Get('settings/contact')
  @AdminOnly()
  getContactSettings() {
    return this.settingsService.getContact();
  }

  @Patch('settings/contact')
  @AdminOnly()
  async updateContactSettings(@Body() body: { whatsappNumber?: string; phone?: string; emails?: string }) {
    await this.settingsService.setContact(body);
    return this.settingsService.getContact();
  }

  @Get('settings/content')
  @AdminOnly()
  getContentSettings() {
    return this.settingsService.getContent();
  }

  @Patch('settings/content')
  @AdminOnly()
  async updateContentSettings(
    @Body()
    body: {
      footerDisclaimer?: string;
      productDisclaimerTitle?: string;
      productDisclaimerText?: string;
      homeHeroIntro?: string;
      homeStoryLabel?: string;
      homeStoryHeading?: string;
      homeStoryHtml?: string;
    },
  ) {
    await this.settingsService.setContent(body);
    return this.settingsService.getContent();
  }

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

  @Get('whatsapp/status')
  @AdminOnly()
  whatsappStatus() {
    return this.whatsappLink.getStatus();
  }

  @Get('whatsapp/qr')
  @AdminOnly()
  async whatsappQR() {
    return this.whatsappLink.getQR();
  }

  @Post('whatsapp/relink')
  @AdminOnly()
  async whatsappRelink() {
    return this.whatsappLink.relink();
  }

  @Get('support')
  @AdminOnly()
  async listSupportTickets(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.supportService.findAllForAdmin({
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Patch('support/:id')
  @AdminOnly()
  async updateSupportTicket(@Param('id') id: string, @Body() body: { status?: string; adminReply?: string }) {
    return this.supportService.updateByAdmin(id, body);
  }

  @Get('push/fcm-supported')
  @StaffOrAdmin()
  fcmSupported() {
    return { supported: true };
  }

  @Post('push/fcm-token')
  @StaffOrAdmin()
  registerFcmToken(@Body() body: { token?: string }) {
    if (body?.token) this.pushService.addFcmToken(body.token);
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
