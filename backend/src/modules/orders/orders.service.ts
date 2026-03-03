import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { OrderStatusTimeline } from '../../entities/order-status-timeline.entity';
import { EmailService } from '../notifications/email.service';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { EventsGateway } from '../events/events.gateway';

function randomCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private itemRepo: Repository<OrderItem>,
    @InjectRepository(OrderStatusTimeline) private timelineRepo: Repository<OrderStatusTimeline>,
    private emailService: EmailService,
    private whatsappService: WhatsAppService,
    private eventsGateway: EventsGateway,
  ) {}

  async create(dto: {
    customerId?: string;
    customerName?: string;
    email?: string;
    phone?: string;
    address?: string;
    total: number;
    paymentMethod?: string;
    items: Array<{ productId: string; variantId?: string; qty: number; price: number }>;
  }): Promise<Order> {
    const order = this.orderRepo.create({
      customerId: dto.customerId ?? null,
      customerName: dto.customerName ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
      total: dto.total,
      status: 'pending',
      paymentMethod: dto.paymentMethod || 'cash_on_delivery',
      confirmationCode: randomCode(6),
      items: dto.items.map((i) => this.itemRepo.create(i)),
    });
    await this.orderRepo.save(order);
    await this.timelineRepo.save(
      this.timelineRepo.create({ orderId: order.id, status: 'pending', changedBy: 'system' }),
    );
    const full = await this.findOne(order.id);
    const itemsSummary = (full.items || []).map((i) => `- ${i.productId} x${i.qty} = PKR ${((i.price * i.qty) / 100).toLocaleString()}`).join('\n');
    if (full.email) this.emailService.sendOrderConfirmation(full.email, full, itemsSummary).catch(() => {});
    if (full.phone) this.whatsappService.sendOrderConfirmation(full.phone, full.id, full.confirmationCode).catch(() => {});
    this.eventsGateway.emitOrderCreated({ id: full.id, status: full.status, createdAt: full.createdAt?.toISOString?.() });
    return full;
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['items', 'statusTimeline'],
      order: { statusTimeline: { changedAt: 'ASC' } },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(orderId: string, status: string, changedBy: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    order.status = status;
    if (status === 'shipped' && !order.dispatchedAt) order.dispatchedAt = new Date();
    await this.orderRepo.save(order);
    await this.timelineRepo.save(
      this.timelineRepo.create({ orderId, status, changedBy: changedBy === 'staff' ? 'staff' : 'admin' }),
    );
    const updated = await this.findOne(orderId);
    this.eventsGateway.emitOrderUpdated({ id: orderId, status: updated.status });
    return updated;
  }
}
