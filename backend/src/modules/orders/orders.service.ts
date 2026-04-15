import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { OrderStatusTimeline } from '../../entities/order-status-timeline.entity';
import { Customer } from '../../entities/customer.entity';
import { Product } from '../../entities/product.entity';
import { EmailService } from '../notifications/email.service';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { PushService } from '../notifications/push.service';
import { EventsGateway } from '../events/events.gateway';
import { MetaConversionsService } from '../analytics/meta-conversions.service';
import { AnalyticsService } from '../analytics/analytics.service';

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
    @InjectRepository(Product) private productRepo: Repository<Product>,
    private emailService: EmailService,
    private whatsappService: WhatsAppService,
    private pushService: PushService,
    private eventsGateway: EventsGateway,
    private metaConversions: MetaConversionsService,
    private analyticsService: AnalyticsService,
  ) {}

  /**
   * Server-side prices and stock: ignore client `price` / `total` (fraud / tampering).
   */
  private async buildValidatedOrderLines(
    items: Array<{ productId: string; variantId?: string; qty: number; price: number }>,
  ): Promise<Array<{ productId: string; variantId: string | null; qty: number; price: number }>> {
    if (!items?.length) throw new BadRequestException('Order must include at least one item');
    const productCache = new Map<string, Product>();
    const lines: Array<{ productId: string; variantId: string | null; qty: number; price: number }> = [];

    for (const line of items) {
      const qty = Math.max(1, Math.floor(Number(line.qty)) || 1);
      let product: Product | undefined = productCache.get(line.productId);
      if (!product) {
        const loaded = await this.productRepo.findOne({
          where: { id: line.productId },
          relations: ['variants'],
        });
        if (!loaded) throw new BadRequestException('One or more products are no longer available');
        product = loaded;
        productCache.set(line.productId, product);
      }
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const wantVid =
        line.variantId && String(line.variantId).trim() ? String(line.variantId).trim() : null;

      let unitCents: number;
      let variantId: string | null = wantVid;

      if (variants.length === 0) {
        unitCents = product.price;
        variantId = null;
      } else if (variants.length === 1) {
        const only = variants[0];
        unitCents = only.price;
        variantId = only.id;
      } else {
        if (!wantVid) throw new BadRequestException(`Please select a variant for: ${product.name}`);
        const hit = variants.find((v) => v.id === wantVid);
        if (!hit) throw new BadRequestException(`Invalid variant for: ${product.name}`);
        unitCents = hit.price;
      }

      if (product.outOfStock) throw new BadRequestException(`${product.name} is out of stock`);

      lines.push({ productId: product.id, variantId, qty, price: unitCents });
    }

    const sumByProduct = new Map<string, number>();
    for (const L of lines) {
      sumByProduct.set(L.productId, (sumByProduct.get(L.productId) || 0) + L.qty);
    }
    for (const [pid, need] of sumByProduct) {
      const p = productCache.get(pid);
      if (p && p.inventory < need) {
        throw new BadRequestException(`Not enough stock for ${p.name}`);
      }
    }

    return lines;
  }

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
    const validatedLines = await this.buildValidatedOrderLines(dto.items);
    const total = validatedLines.reduce((s, L) => s + L.price * L.qty, 0);
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
    const emailTrimmed = dto.email?.trim() || null;
    const order = this.orderRepo.create({
      id: orderId,
      customerId: dto.customerId ?? null,
      customerName: dto.customerName ?? null,
      email: emailTrimmed,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
      total,
      status: 'pending',
      paymentMethod: dto.paymentMethod || 'cash_on_delivery',
      confirmationCode: randomCode(6),
      items: validatedLines.map((i) => this.itemRepo.create(i)),
    });
    await this.orderRepo.save(order);
    await this.timelineRepo.save(
      this.timelineRepo.create({ orderId: order.id, status: 'pending', changedBy: 'system' }),
    );
    const full = await this.findOne(order.id);
    const items = full.items || [];
    const productIds = Array.from(new Set(items.map((i) => i.productId).filter(Boolean)));
    const products = productIds.length
      ? await this.productRepo.find({ where: { id: productIds.length === 1 ? productIds[0] : productIds as any } })
      : [];
    const productNameMap = new Map(products.map((p) => [p.id, p.name]));
    const itemsSummary = items
      .map((i) => {
        const name = productNameMap.get(i.productId) || i.productId;
        const lineTotal = ((i.price * i.qty) / 100).toLocaleString();
        return `- ${name} x${i.qty} = PKR ${lineTotal}`;
      })
      .join('\n');
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

  /**
   * Admin: send Meta CAPI custom event NS_EV_ORDER_VOID (hashed email/phone + order_id) once per order.
   * Does not remove the original Purchase in Meta; use for signals / custom conversions / audiences.
   */
  async notifyMetaFakePurchaseOrder(orderId: string): Promise<{
    ok: boolean;
    alreadySent?: boolean;
    metaVoidSentAt?: Date | null;
  }> {
    const order = await this.findOne(orderId);
    if (order.metaVoidSentAt) {
      return { ok: true, alreadySent: true, metaVoidSentAt: order.metaVoidSentAt };
    }
    const eventId = `ns_void_${order.id}`.slice(0, 128);
    const ads = await this.analyticsService.getMetaAttributionForPurchaseOrder(order.id);
    const result = await this.metaConversions.send({
      eventName: 'NS_EV_ORDER_VOID',
      eventId,
      orderId: order.id,
      value: Math.round((Math.max(0, Number(order.total) || 0) / 100) * 100) / 100,
      currency: 'PKR',
      numItems: 0,
      contentIds: [],
      email: order.email || undefined,
      phone: order.phone || undefined,
      adsCampaignId: ads?.campaignId || undefined,
      adsAdsetId: ads?.adsetId || undefined,
      adsAdId: ads?.adId || undefined,
    });
    if (result.skipped) {
      throw new ServiceUnavailableException(
        'Meta CAPI is not configured (set META_PIXEL_ID and META_CONVERSIONS_ACCESS_TOKEN on the server).',
      );
    }
    if (!result.ok) {
      throw new BadRequestException('Meta CAPI request failed. Check server logs for details.');
    }
    order.metaVoidSentAt = new Date();
    await this.orderRepo.save(order);
    return { ok: true, metaVoidSentAt: order.metaVoidSentAt };
  }
}
