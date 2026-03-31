import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { Request } from 'express';
import { MetaCapiDto } from './dto/meta-capi.dto';

@Injectable()
export class MetaConversionsService {
  private readonly logger = new Logger(MetaConversionsService.name);

  private sha256Hex(s: string): string {
    return crypto.createHash('sha256').update(s).digest('hex');
  }

  private hashEmail(email: string): string | null {
    const e = String(email || '').trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
    return this.sha256Hex(e);
  }

  private hashPhone(phone: string): string | null {
    let d = String(phone || '').replace(/\D/g, '');
    if (!d) return null;
    if (d.startsWith('0') && d.length >= 10 && d.length <= 11) d = `92${d.slice(1)}`;
    else if (!d.startsWith('92') && d.length === 10 && d.startsWith('3')) d = `92${d}`;
    if (d.length < 10 || d.length > 15) return null;
    return this.sha256Hex(d);
  }

  async send(dto: MetaCapiDto, req?: Request): Promise<{ ok: boolean; skipped?: boolean }> {
    const pixelId = process.env.META_PIXEL_ID?.trim();
    const token = process.env.META_CONVERSIONS_ACCESS_TOKEN?.trim();
    if (!pixelId || !token) {
      return { ok: false, skipped: true };
    }

    const user_data: Record<string, string | string[]> = {};
    const em = dto.email ? this.hashEmail(dto.email) : null;
    if (em) user_data.em = [em];
    const ph = dto.phone ? this.hashPhone(dto.phone) : null;
    if (ph) user_data.ph = [ph];
    if (dto.fbp) user_data.fbp = dto.fbp;
    if (dto.fbc) user_data.fbc = dto.fbc;

    const ua = dto.clientUserAgent || (req?.headers?.['user-agent'] as string | undefined);
    if (ua) user_data.client_user_agent = ua.slice(0, 512);

    const ip =
      dto.clientIpAddress ||
      (typeof req?.headers?.['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0].trim()
        : undefined) ||
      req?.socket?.remoteAddress;
    if (ip && /^[\d.:a-fA-F]+$/.test(ip)) user_data.client_ip_address = ip.slice(0, 45);

    const custom_data: Record<string, string | number | string[]> = {
      content_ids: dto.contentIds.map((id) => String(id)),
      content_type: 'product',
      currency: (dto.currency || 'PKR').toUpperCase().slice(0, 3),
      value: Number(dto.value) || 0,
      num_items: dto.numItems ?? dto.contentIds.length,
    };
    if (Array.isArray(dto.categoryIds) && dto.categoryIds.length) {
      custom_data.content_category_ids = dto.categoryIds.map((id) => String(id));
    }
    if (dto.orderId) custom_data.order_id = String(dto.orderId);

    const event = {
      event_name: dto.eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: dto.eventId,
      event_source_url: (dto.eventSourceUrl || '').slice(0, 2000) || undefined,
      action_source: 'website',
      user_data,
      custom_data,
    };

    const body: Record<string, unknown> = { data: [event] };
    const testCode = process.env.META_TEST_EVENT_CODE?.trim();
    if (testCode) body.test_event_code = testCode;

    const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        this.logger.warn(`Meta CAPI error: ${res.status} ${JSON.stringify(json)}`);
        return { ok: false };
      }
      return { ok: true };
    } catch (e) {
      this.logger.warn(`Meta CAPI fetch failed: ${e instanceof Error ? e.message : String(e)}`);
      return { ok: false };
    }
  }
}
