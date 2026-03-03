import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Public } from '../../common/decorators/public.decorator';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private service: OrdersService) {}

  @Public()
  @Post()
  async create(@Body() dto: CreateOrderDto) {
    const order = await this.service.create({
      customerId: dto.customerId,
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

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
