import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private service: OrdersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Req() req: { user: { id: string } }, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    const opts = {
      limit: limit ? Math.min(100, Math.max(1, parseInt(limit, 10) || 50)) : 50,
      offset: offset ? Math.max(0, parseInt(offset, 10) || 0) : 0,
    };
    return this.service.findManyByCustomerId(req.user.id, opts);
  }

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  async create(@Req() req: { user?: { id: string } }, @Body() dto: CreateOrderDto) {
    const { website: _honeypot, ...rest } = dto;
    const order = await this.service.create({
      customerId: req.user?.id ?? undefined,
      customerName: rest.customerName,
      email: rest.email,
      phone: rest.phone,
      address: rest.address,
      total: rest.total,
      paymentMethod: rest.paymentMethod,
      items: rest.items,
    });
    return order;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    const order = await this.service.findOne(id);
    if (order.customerId !== req.user.id) throw new ForbiddenException('Not your order');
    return order;
  }
}
