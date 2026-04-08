import { Controller, Get, Post, Param, Patch, Delete, Body, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ProductsService } from '../products/products.service';
import { PushService } from '../notifications/push.service';
import { WhatsAppLinkService } from '../notifications/whatsapp-link.service';
import { SettingsService } from '../settings/settings.service';
import { SupportService } from '../support/support.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { MetaAttributionClearDto } from '../analytics/dto/meta-attribution-clear.dto';
import { CategoriesService } from '../categories/categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../categories/dto/admin-category.dto';
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
    private analyticsService: AnalyticsService,
    private categoriesService: CategoriesService,
  ) {}

  @Get('analytics/events')
  @AdminOnly()
  async analyticsEvents(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sessionId') sessionId?: string,
    @Query('email') email?: string,
    @Query('limit') limitStr?: string,
  ) {
    let fromD: Date | undefined;
    let toD: Date | undefined;
    if (from) {
      fromD = new Date(from);
      if (Number.isNaN(fromD.getTime())) throw new BadRequestException('Invalid from date');
    }
    if (to) {
      toD = new Date(to);
      if (Number.isNaN(toD.getTime())) throw new BadRequestException('Invalid to date');
    }
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    return this.analyticsService.listEventsForAdmin({
      from: fromD,
      to: toD,
      sessionId: sessionId || undefined,
      customerEmail: email || undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
  }

  @Get('analytics/meta-campaigns')
  @AdminOnly()
  async analyticsMetaCampaigns(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('campaignId') campaignId?: string,
    @Query('adsetId') adsetId?: string,
    @Query('adId') adId?: string,
  ) {
    let fromD: Date | undefined;
    let toD: Date | undefined;
    if (from) {
      fromD = new Date(from);
      if (Number.isNaN(fromD.getTime())) throw new BadRequestException('Invalid from date');
    }
    if (to) {
      toD = new Date(to);
      if (Number.isNaN(toD.getTime())) throw new BadRequestException('Invalid to date');
    }
    const max = 128;
    const clip = (s: string | undefined) => {
      const t = s?.trim();
      if (!t) return undefined;
      if (t.length > max) throw new BadRequestException(`Filter id too long (max ${max})`);
      return t;
    };
    return this.analyticsService.getMetaCampaignDashboard({
      from: fromD,
      to: toD,
      campaignId: clip(campaignId),
      adsetId: clip(adsetId),
      adId: clip(adId),
    });
  }

  @Get('analytics/meta-export/purchases')
  @AdminOnly()
  async analyticsMetaPurchasesExport(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('campaignId') campaignId?: string,
    @Query('adsetId') adsetId?: string,
    @Query('adId') adId?: string,
  ) {
    let fromD: Date | undefined;
    let toD: Date | undefined;
    if (from) {
      fromD = new Date(from);
      if (Number.isNaN(fromD.getTime())) throw new BadRequestException('Invalid from date');
    }
    if (to) {
      toD = new Date(to);
      if (Number.isNaN(toD.getTime())) throw new BadRequestException('Invalid to date');
    }
    const max = 128;
    const clip = (s: string | undefined) => {
      const t = s?.trim();
      if (!t) return undefined;
      if (t.length > max) throw new BadRequestException(`Filter id too long (max ${max})`);
      return t;
    };
    return this.analyticsService.getMetaPurchaseExportRows({
      from: fromD,
      to: toD,
      campaignId: clip(campaignId),
      adsetId: clip(adsetId),
      adId: clip(adId),
    });
  }

  @Post('analytics/meta-campaigns/clear-attribution')
  @AdminOnly()
  async analyticsClearMetaAttribution(@Body() dto: MetaAttributionClearDto) {
    return this.analyticsService.clearMetaAttributionTargets(dto);
  }

  @Post('analytics/meta-campaigns/clear-all-attribution')
  @AdminOnly()
  async analyticsClearAllMetaAttribution() {
    return this.analyticsService.clearAllMetaAttributionGlobally();
  }

  @Delete('analytics/events')
  @AdminOnly()
  async analyticsDeleteAllEvents() {
    return this.analyticsService.deleteAllAnalyticsEvents();
  }

  @Delete('analytics/sessions/:sessionId')
  @AdminOnly()
  async analyticsDeleteSession(@Param('sessionId') sessionId: string) {
    const sid = sessionId != null ? String(sessionId).trim() : '';
    if (!sid || sid.length > 100) throw new BadRequestException('Invalid session id');
    return this.analyticsService.deleteEventsBySessionId(sid);
  }

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

  @Get('categories')
  @AdminOnly()
  async adminCategories() {
    return this.categoriesService.findAll();
  }

  @Post('categories')
  @AdminOnly()
  async adminCreateCategory(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch('categories/:id')
  @AdminOnly()
  async adminUpdateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete('categories/:id')
  @AdminOnly()
  async adminDeleteCategory(@Param('id') id: string) {
    return this.categoriesService.remove(id);
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

  @Post('orders/:id/meta-notify-fake-purchase')
  @AdminOnly()
  async metaNotifyFakePurchase(@Param('id') id: string) {
    const tid = id != null ? String(id).trim() : '';
    if (!tid || tid.length > 16) throw new BadRequestException('Invalid order id');
    return this.service.notifyMetaFakePurchaseOrder(tid);
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
