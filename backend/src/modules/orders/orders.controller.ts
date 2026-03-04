import { Body, Controller, ForbiddenException, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private service: OrdersService) {}

  @Post()
  async create(@Req() req: { user: { id: string } }, @Body() dto: CreateOrderDto) {
    const order = await this.service.create({
      customerId: req.user.id,
      customerName: dto.customerName,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      total: dto.total,
      paymentMethod: dto.paymentMethod,
      items: dto.items,
    });
    return order;
  }

  @Get(':id')
  async findOne(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    const order = await this.service.findOne(id);
    if (order.customerId !== req.user.id) throw new ForbiddenException('Not your order');
    return order;
  }
}
