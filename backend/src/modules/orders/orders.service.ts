import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { OrderStatusTimeline } from '../../entities/order-status-timeline.entity';
import { Customer } from '../../entities/customer.entity';
import { EmailService } from '../notifications/email.service';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { PushService } from '../notifications/push.service';
import { EventsGateway } from '../events/events.gateway';

function randomCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const ORDER_ID_LENGTH = 8;
function generateOrderId(): string {
  return randomCode(ORDER_ID_LENGTH);
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private itemRepo: Repository<OrderItem>,
    @InjectRepository(OrderStatusTimeline) private timelineRepo: Repository<OrderStatusTimeline>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    private emailService: EmailService,
    private whatsappService: WhatsAppService,
    private pushService: PushService,
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
    if (dto.customerId) {
      const customer = await this.customerRepo.findOne({ where: { id: dto.customerId } });
      if (customer?.blocked) throw new ForbiddenException('Account is blocked.');
    }
    let orderId = '';
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generateOrderId();
      if (!candidate || candidate.length !== ORDER_ID_LENGTH) continue;
      const existing = await this.orderRepo.findOne({ where: { id: candidate } });
      if (!existing) {
        orderId = candidate;
        break;
      }
      if (attempt === 9) throw new BadRequestException('Could not generate unique order ID. Please try again.');
    }
    if (!orderId) throw new BadRequestException('Could not generate order ID. Please try again.');
    const order = this.orderRepo.create({
      id: orderId,
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
    this.pushService.notifyNewOrder({ id: full.id, total: full.total, customerName: full.customerName }).catch(() => {});
    return full;
  }

  async findManyByCustomerId(customerId: string, params?: { limit?: number; offset?: number }): Promise<Order[]> {
    const limit = Math.min(100, Math.max(1, params?.limit ?? 50));
    const offset = Math.max(0, params?.offset ?? 0);
    return this.orderRepo.find({
      where: { customerId },
      relations: ['items', 'statusTimeline'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
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
    const staffAllowedStatuses = ['shipped', 'delivered', 'cancelled', 'returned'];
    if (changedBy === 'staff' && !staffAllowedStatuses.includes(status)) {
      throw new BadRequestException('Staff can only set status to: shipped, delivered, cancelled, or returned.');
    }
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
