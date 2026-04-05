import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { Request } from 'express';
import { MetaCapiDto } from './dto/meta-capi.dto';

@Injectable()
export class MetaConversionsService {
  private readonly logger = new Logger(MetaConversionsService.name);

  /** Graph `events` POST: enough headroom for slow paths; avoids hanging workers. */
  private static readonly CAPI_GRAPH_TIMEOUT_MS = 15_000;
  /** One try plus retries on 429 / 5xx / timeout (backoff in `send`). */
  private static readonly CAPI_MAX_ATTEMPTS = 3;

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

  /** Meta normalization: lowercase, strip to a-z0-9, then SHA256. */
  private hashNormalizedPII(raw: string, maxLen: number): string | null {
    const t = String(raw || '')
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .slice(0, maxLen);
    return t.length ? this.sha256Hex(t) : null;
  }

  private splitFullName(full: string): { fn: string; ln: string } {
    const parts = String(full || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    return {
      fn: parts[0] || '',
      ln: parts.length > 1 ? parts.slice(1).join(' ') : '',
    };
  }

  private hashCountryCode(code: string): string | null {
    const c = String(code || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z]/g, '');
    if (c.length !== 2) return null;
    return this.sha256Hex(c);
  }

  private attachTestEventCodeInThisEnvironment(): boolean {
    if (process.env.META_ALLOW_TEST_EVENT_IN_PRODUCTION === 'true') return true;
    return process.env.NODE_ENV !== 'production';
  }

  /** Server env wins; else browser may pass same code as Pixel (`NEXT_PUBLIC_META_TEST_EVENT_CODE`). */
  private resolveMetaTestEventCode(dto: MetaCapiDto): string | undefined {
    const fromEnv = process.env.META_TEST_EVENT_CODE?.trim();
    if (fromEnv) return fromEnv;
    const fromClient = dto.testEventCode?.trim();
    if (!fromClient) return undefined;
    if (process.env.NODE_ENV !== 'production') return fromClient;
    if (process.env.META_ALLOW_TEST_EVENT_IN_PRODUCTION === 'true') return fromClient;
    return undefined;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  /** CAPI `custom_data.value`: JSON float, monetary (2 d.p.). */
  private metaCustomDataValue(raw: unknown): number {
    if (raw === null || raw === undefined || raw === '') return 0;
    const n =
      typeof raw === 'number' && Number.isFinite(raw)
        ? raw
        : parseFloat(String(raw).trim().replace(/,/g, ''));
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100) / 100;
  }

  /** CAPI `custom_data.num_items` must be a non-negative integer. */
  private metaCustomDataNumItems(raw: unknown): number {
    if (raw === null || raw === undefined || raw === '') return 0;
    const x = Number(raw);
    if (!Number.isFinite(x)) return 0;
    return Math.max(0, Math.round(x));
  }

  async send(
    dto: MetaCapiDto,
    req?: Request,
  ): Promise<{ ok: boolean; skipped?: boolean; eventsReceived?: number }> {
    const pixelId = process.env.META_PIXEL_ID?.trim();
    const token = process.env.META_CONVERSIONS_ACCESS_TOKEN?.trim();
    if (!pixelId || !token) {
      return { ok: false, skipped: true };
    }

    const user_data: Record<string, string | string[]> = {};
    const isPurchaseEvent = dto.eventName === 'Purchase' || dto.eventName === 'NS_EV_PRCHS_SUCCESS';
    const isOrderVoidEvent = dto.eventName === 'NS_EV_ORDER_VOID';

    if (isOrderVoidEvent) {
      const em = dto.email ? this.hashEmail(dto.email) : null;
      if (em) user_data.em = [em];
      const ph = dto.phone ? this.hashPhone(dto.phone) : null;
      if (ph) user_data.ph = [ph];
    }

    if (isPurchaseEvent) {
      const em = dto.email ? this.hashEmail(dto.email) : null;
      if (em) user_data.em = [em];
      const ph = dto.phone ? this.hashPhone(dto.phone) : null;
      if (ph) user_data.ph = [ph];
      const { fn, ln } = this.splitFullName(dto.customerName || '');
      const hFn = fn ? this.hashNormalizedPII(fn, 50) : null;
      const hLn = ln ? this.hashNormalizedPII(ln, 50) : null;
      if (hFn) user_data.fn = [hFn];
      if (hLn) user_data.ln = [hLn];
      const hCt = dto.city ? this.hashNormalizedPII(dto.city, 80) : null;
      if (hCt) user_data.ct = [hCt];
      const hSt = dto.state ? this.hashNormalizedPII(dto.state, 50) : null;
      if (hSt) user_data.st = [hSt];
      const hZp = dto.zip ? this.hashNormalizedPII(dto.zip, 20) : null;
      if (hZp) user_data.zp = [hZp];
      const hStreet = dto.street ? this.hashNormalizedPII(dto.street, 120) : null;
      if (hStreet) user_data.street = [hStreet];
      const hCountry = dto.country ? this.hashCountryCode(dto.country) : null;
      if (hCountry) user_data.country = [hCountry];
      const oid = dto.orderId?.trim();
      if (oid) {
        const extNorm = oid.replace(/[^\w-]/g, '').slice(0, 64);
        const extHash = extNorm ? this.hashNormalizedPII(extNorm, 64) : null;
        if (extHash) user_data.external_id = [extHash];
      }
    }

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

    const ids = (dto.contentIds ?? []).map((id) => String(id));
    const contentTypeRaw = (dto.contentType || 'product').toString().trim().slice(0, 50);
    // custom_data: commerce fields + id arrays only — never product name, category name, description, or `contents`.
    const custom_data: Record<string, string | number | string[]> = {
      content_type: contentTypeRaw || 'product',
      currency: (dto.currency || 'PKR').toUpperCase().slice(0, 3),
      value: this.metaCustomDataValue(dto.value),
    };
    if (ids.length) custom_data.content_ids = ids;
    if (dto.numItems != null && dto.numItems >= 0) {
      custom_data.num_items = this.metaCustomDataNumItems(dto.numItems);
    }
    if (dto.categoryIds != null) {
      custom_data.content_category_ids = dto.categoryIds.map((id) => String(id));
    }
    if (dto.orderId) custom_data.order_id = String(dto.orderId);
    const ac = dto.adsCampaignId?.trim();
    const aa = dto.adsAdsetId?.trim();
    const aid = dto.adsAdId?.trim();
    if (ac) custom_data.campaign_id = ac.slice(0, 128);
    if (aa) custom_data.adset_id = aa.slice(0, 128);
    if (aid) custom_data.ad_id = aid.slice(0, 128);

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
    const testCode = this.resolveMetaTestEventCode(dto);
    if (testCode && this.attachTestEventCodeInThisEnvironment()) {
      body.test_event_code = testCode;
    } else if (process.env.META_TEST_EVENT_CODE?.trim() && !this.attachTestEventCodeInThisEnvironment()) {
      this.logger.warn(
        'META_TEST_EVENT_CODE is set but ignored in production (unset it or set META_ALLOW_TEST_EVENT_IN_PRODUCTION=true).',
      );
    }

    const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`;
    const { CAPI_GRAPH_TIMEOUT_MS: timeoutMs, CAPI_MAX_ATTEMPTS: maxAttempts } = MetaConversionsService;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
        const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const retryable = res.status === 429 || (res.status >= 500 && res.status <= 599);
        if (retryable && attempt < maxAttempts) {
          const delay = Math.min(2500, 400 * attempt);
          this.logger.warn(`Meta CAPI ${res.status}, retry ${attempt}/${maxAttempts} in ${delay}ms`);
          await this.sleep(delay);
          continue;
        }
        if (!res.ok) {
          this.logger.warn(`Meta CAPI error: ${res.status} ${JSON.stringify(json)}`);
          return { ok: false };
        }
        const fbErr = json['error'];
        if (fbErr != null) {
          if (typeof fbErr === 'object') {
            this.logger.warn(`Meta CAPI response error: ${JSON.stringify(fbErr)}`);
            return { ok: false };
          }
          if (typeof fbErr === 'string' && fbErr.trim()) {
            this.logger.warn(`Meta CAPI response error: ${fbErr}`);
            return { ok: false };
          }
        }
        // Graph often returns events_received; dedupe / edge cases may yield 0 while HTTP is still 200 — do not fail the relay.
        const rawRecv = json['events_received'];
        let eventsReceived: number | undefined;
        if (typeof rawRecv === 'number' && !Number.isNaN(rawRecv)) eventsReceived = rawRecv;
        else if (typeof rawRecv === 'string' && rawRecv.trim() !== '') {
          const p = parseInt(rawRecv.trim(), 10);
          if (!Number.isNaN(p)) eventsReceived = p;
        }
        if (eventsReceived !== undefined && eventsReceived < 1) {
          this.logger.warn(`Meta CAPI events_received=${eventsReceived} (HTTP 200, check Events Manager / dedupe) ${JSON.stringify(json)}`);
        }
        return { ok: true, eventsReceived };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const isAbort = e instanceof Error && (e.name === 'AbortError' || e.name === 'TimeoutError');
        if ((isAbort || msg.includes('fetch')) && attempt < maxAttempts) {
          const delay = Math.min(2500, 400 * attempt);
          this.logger.warn(`Meta CAPI fetch failed (${msg}), retry ${attempt}/${maxAttempts} in ${delay}ms`);
          await this.sleep(delay);
          continue;
        }
        this.logger.warn(`Meta CAPI fetch failed: ${msg}`);
        return { ok: false };
      }
    }
    return { ok: false };
  }
}
