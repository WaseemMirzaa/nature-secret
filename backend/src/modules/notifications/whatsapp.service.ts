import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as twilio from 'twilio';
import { Order } from '../../entities/order.entity';
import { OrderStatusTimeline } from '../../entities/order-status-timeline.entity';
import { WhatsAppLinkService } from './whatsapp-link.service';

@Injectable()
export class WhatsAppService {
  private client: twilio.Twilio | null = null;
  private from: string | null = null;

  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderStatusTimeline) private timelineRepo: Repository<OrderStatusTimeline>,
    private whatsappLink: WhatsAppLinkService,
  ) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;
    if (sid && token && from) {
      this.client = twilio(sid, token);
      this.from = from;
    }
  }

  async sendOrderConfirmation(phone: string | null, orderId: string, confirmationCode: string | null) {
    if (!phone) return;
    const sent = await this.whatsappLink.sendOrderConfirmation(phone, orderId, confirmationCode);
    if (sent) return;
    if (!this.client || !this.from) return;
    const normalized = phone.replace(/\D/g, '');
    const to = normalized.startsWith('92') ? `whatsapp:+${normalized}` : `whatsapp:+92${normalized}`;
    const codeMsg = confirmationCode ? ` Reply YES to confirm your order.` : '';
    try {
      await this.client.messages.create({
        from: this.from,
        to,
        body: `Nature Secret: Your order #${orderId} has been placed.${codeMsg}`,
      });
    } catch (e) {
      console.error('WhatsApp send failed:', e);
    }
  }

  normalizePhone(phone: string): string {
    return (phone || '').replace(/\D/g, '').slice(-10);
  }

  async handleIncomingMessage(from: string, body: string): Promise<string | null> {
    const trimmed = (body || '').trim().toUpperCase();
    if (trimmed !== 'YES' && !trimmed.startsWith('YES ')) return null;
    const fromNorm = this.normalizePhone(from.replace('whatsapp:', ''));
    const orders = await this.orderRepo.find({
      where: { status: 'pending' },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    for (const order of orders) {
      const orderPhoneNorm = order.phone ? this.normalizePhone(order.phone) : '';
      if (orderPhoneNorm && orderPhoneNorm !== fromNorm) continue;
      if (trimmed === 'YES' || (order.confirmationCode && trimmed === `YES ${order.confirmationCode}`)) {
        order.status = 'confirmed';
        await this.orderRepo.save(order);
        await this.timelineRepo.save(
          this.timelineRepo.create({ orderId: order.id, status: 'confirmed', changedBy: 'whatsapp' }),
        );
        return order.id;
      }
    }
    return null;
  }
}
