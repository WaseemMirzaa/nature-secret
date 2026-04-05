import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { AnalyticsEvent } from '../../entities/analytics-event.entity';
import { Order } from '../../entities/order.entity';
import { MetaAttributionClearDto } from './dto/meta-attribution-clear.dto';

const META_EVENT_TYPES = [
  'pageView',
  'productView',
  'outOfStockClick',
  'addToCart',
  'addToWishlist',
  'initiateCheckout',
  'purchase',
  'checkoutPageView',
  'orderConfirmationView',
  'placeOrderClick',
  'whatsappOpen',
] as const;

function num(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function typeParamKey(t: string) {
  return `t_${t.replace(/[^a-zA-Z0-9_]/g, '_')}`;
}

function payloadSource(p: unknown): string {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return '';
  const s = (p as Record<string, unknown>)['source'];
  return typeof s === 'string' ? s.slice(0, 80).trim() : '';
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsEvent) private repo: Repository<AnalyticsEvent>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
  ) {}

  async track(dto: {
    type: string;
    sessionId: string;
    path?: string;
    productId?: string;
    contentId?: string;
    orderId?: string;
    campaignId?: string;
    adsetId?: string;
    adId?: string;
    customerEmail?: string;
    customerName?: string;
    payload?: Record<string, unknown>;
  }) {
    const contentId = dto.contentId ?? dto.productId ?? null;
    const event = this.repo.create({
      type: dto.type,
      sessionId: dto.sessionId,
      path: dto.path ?? null,
      productId: dto.productId ?? contentId,
      contentId,
      orderId: dto.orderId ?? null,
      campaignId: dto.campaignId ?? null,
      adsetId: dto.adsetId ?? null,
      adId: dto.adId ?? null,
      customerEmail: dto.customerEmail ?? null,
      customerName: dto.customerName ?? null,
      payload: dto.payload ?? null,
    });
    await this.repo.save(event);
    return event;
  }

  /** Shape expected by storefront admin analytics UI. */
  toClientEvent(e: AnalyticsEvent): Record<string, unknown> {
    const payload =
      e.payload && typeof e.payload === 'object' && !Array.isArray(e.payload) ? { ...e.payload } : {};
    const ts = e.timestamp instanceof Date ? e.timestamp.toISOString() : String(e.timestamp);
    return {
      ...payload,
      type: e.type,
      timestamp: ts,
      sessionId: e.sessionId,
      path: e.path ?? payload.path,
      contentId: e.contentId ?? e.productId ?? payload.contentId,
      productId: e.productId ?? payload.productId,
      orderId: e.orderId ?? payload.orderId,
      customerEmail: e.customerEmail ?? undefined,
      customerName: e.customerName ?? undefined,
      campaignId: e.campaignId ?? payload.campaignId,
      adsetId: e.adsetId ?? payload.adsetId,
      adId: e.adId ?? payload.adId,
    };
  }

  async listEventsForAdmin(params: {
    from?: Date;
    to?: Date;
    sessionId?: string;
    customerEmail?: string;
    limit?: number;
  }) {
    const limit = Math.min(50000, Math.max(1, params.limit ?? 25000));
    const to = params.to ?? new Date();
    const from = params.from ?? new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);
    const qb = this.repo.createQueryBuilder('e');
    qb.andWhere('e.timestamp >= :from', { from });
    qb.andWhere('e.timestamp <= :to', { to });
    if (params.sessionId) qb.andWhere('e.sessionId = :sid', { sid: params.sessionId });
    if (params.customerEmail) {
      const em = params.customerEmail.trim();
      qb.andWhere('LOWER(TRIM(e.customerEmail)) = LOWER(:em)', { em });
    }
    const rows = await qb.orderBy('e.timestamp', 'ASC').take(limit).getMany();
    return { events: rows.map((r) => this.toClientEvent(r)), from, to };
  }

  async getSessions(params: { from?: Date; to?: Date; page?: number; limit?: number }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const qb = this.createAnalyticsFlatQb()
      .select('e.sessionId')
      .addSelect('MIN(e.timestamp)', 'first')
      .addSelect('MAX(e.timestamp)', 'last')
      .addSelect('COUNT(*)', 'count')
      .groupBy('e.sessionId');
    if (params.from) qb.andWhere('e.timestamp >= :from', { from: params.from });
    if (params.to) qb.andWhere('e.timestamp <= :to', { to: params.to });
    const countQb = this.createAnalyticsFlatQb().select('COUNT(DISTINCT e.sessionId)', 'cnt');
    if (params.from) countQb.andWhere('e.timestamp >= :from', { from: params.from });
    if (params.to) countQb.andWhere('e.timestamp <= :to', { to: params.to });
    const total = Number((await countQb.getRawOne())?.cnt ?? 0);
    const raw = await qb
      .orderBy('last', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();
    return { data: raw, total, page, limit };
  }

  async getEventsBySession(sessionId: string) {
    return this.repo.find({ where: { sessionId }, order: { timestamp: 'ASC' } });
  }

  /** Remove all analytics rows for one session (admin GDPR / cleanup). */
  async deleteEventsBySessionId(sessionId: string): Promise<{ deleted: number }> {
    const result = await this.repo.delete({ sessionId });
    return { deleted: Number(result.affected) || 0 };
  }

  async getLoggedInVisitors(params: { from?: Date; to?: Date; page?: number; limit?: number }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const qb = this.createAnalyticsFlatQb()
      .where('e.customerEmail IS NOT NULL AND e.customerEmail != :empty', { empty: '' })
      .select('e.customerEmail')
      .addSelect('e.customerName')
      .addSelect('MIN(e.timestamp)', 'firstSeen')
      .addSelect('MAX(e.timestamp)', 'lastSeen')
      .addSelect('COUNT(*)', 'eventCount')
      .groupBy('e.customerEmail')
      .addGroupBy('e.customerName');
    if (params.from) qb.andWhere('e.timestamp >= :from', { from: params.from });
    if (params.to) qb.andWhere('e.timestamp <= :to', { to: params.to });
    const totalRow = await this.repo.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'cnt')
      .from(`(${qb.clone().orderBy().offset(undefined).limit(undefined).skip(undefined).take(undefined).getQuery()})`, 'sub')
      .setParameters(qb.getParameters())
      .getRawOne();
    const total = Number(totalRow?.cnt ?? 0);
    const raw = await qb
      .orderBy('lastSeen', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();
    return { data: raw, total, page, limit };
  }

  /**
   * Derived-table FROM only — must NOT be a bare table name string or TypeORM resolves it to
   * AnalyticsEvent metadata and prepends `e.id` to SELECT (MySQL ONLY_FULL_GROUP_BY on aggregates).
   * Double-wrapped subquery so `hasMetadata("(SELECT …")` never matches a registered entity/table name.
   */
  private createAnalyticsFlatQb(): SelectQueryBuilder<AnalyticsEvent> {
    const table = this.repo.metadata.tablePath;
    const inner = `(SELECT * FROM \`${table}\`)`;
    return this.repo.manager
      .createQueryBuilder()
      .from(`(SELECT * FROM ${inner} AS _ns_inner)`, 'e') as SelectQueryBuilder<AnalyticsEvent>;
  }

  private coalesceTrim(col: string): string {
    return `COALESCE(NULLIF(TRIM(${col}), ''), '')`;
  }

  private metaHasAttributionClause(): string {
    return `(
      (e.campaignId IS NOT NULL AND LENGTH(TRIM(e.campaignId)) > 0) OR
      (e.adsetId IS NOT NULL AND LENGTH(TRIM(e.adsetId)) > 0) OR
      (e.adId IS NOT NULL AND LENGTH(TRIM(e.adId)) > 0)
    )`;
  }

  private applyMetaFilters(qb: SelectQueryBuilder<AnalyticsEvent>, from: Date, to: Date) {
    qb.andWhere('e.timestamp >= :metaFrom', { metaFrom: from });
    qb.andWhere('e.timestamp <= :metaTo', { metaTo: to });
    qb.andWhere(this.metaHasAttributionClause());
  }

  /** Optional exact match on trimmed attribution ids (AND logic). */
  private applyMetaAttributionIdFilters(
    qb: SelectQueryBuilder<AnalyticsEvent>,
    filters?: { campaignId?: string; adsetId?: string; adId?: string },
  ) {
    if (!filters) return;
    const c = filters.campaignId?.trim();
    const a = filters.adsetId?.trim();
    const d = filters.adId?.trim();
    if (c) qb.andWhere('TRIM(e.campaignId) = :metaFilterCampaignId', { metaFilterCampaignId: c });
    if (a) qb.andWhere('TRIM(e.adsetId) = :metaFilterAdsetId', { metaFilterAdsetId: a });
    if (d) qb.andWhere('TRIM(e.adId) = :metaFilterAdId', { metaFilterAdId: d });
  }

  /** Use after .select() of group dimensions (GROUP BY queries). */
  private addMetaEventCountSelects(qb: SelectQueryBuilder<AnalyticsEvent>) {
    qb.addSelect('COUNT(DISTINCT e.sessionId)', 'uniqueSessions');
    for (const t of META_EVENT_TYPES) {
      const p = typeParamKey(t);
      qb.addSelect(`SUM(CASE WHEN e.type = :${p} THEN 1 ELSE 0 END)`, `cnt_${p}`);
      qb.setParameter(p, t);
    }
  }

  /** Whole-table totals: must use .select() first so MySQL ONLY_FULL_GROUP_BY is not violated (no stray e.id). */
  private selectMetaAggregateTotals(qb: SelectQueryBuilder<AnalyticsEvent>) {
    qb.select('COUNT(DISTINCT e.sessionId)', 'uniqueSessions');
    for (const t of META_EVENT_TYPES) {
      const p = typeParamKey(t);
      qb.addSelect(`SUM(CASE WHEN e.type = :${p} THEN 1 ELSE 0 END)`, `cnt_${p}`);
      qb.setParameter(p, t);
    }
  }

  private normalizeMetaRollupRow(raw: Record<string, unknown>): {
    campaignId: string;
    adsetId: string;
    adId: string;
    uniqueSessions: number;
    events: Record<string, number>;
  } {
    const events: Record<string, number> = {};
    for (const t of META_EVENT_TYPES) {
      const p = typeParamKey(t);
      events[t] = num(raw[`cnt_${p}`]);
    }
    return {
      campaignId: String(raw.campaignId ?? ''),
      adsetId: String(raw.adsetId ?? ''),
      adId: String(raw.adId ?? ''),
      uniqueSessions: num(raw.uniqueSessions),
      events,
    };
  }

  /**
   * Roll up storefront events that carry Meta / URL attribution (campaign_id, adset_id, ad_id).
   * Three grains: by campaign, by campaign+adset, by campaign+adset+ad — correct distinct session counts per grain.
   */
  async getMetaCampaignDashboard(params: {
    from?: Date;
    to?: Date;
    campaignId?: string;
    adsetId?: string;
    adId?: string;
  }) {
    const to = params.to ?? new Date();
    const from = params.from ?? new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);
    const idFilters =
      params.campaignId?.trim() || params.adsetId?.trim() || params.adId?.trim()
        ? {
            campaignId: params.campaignId?.trim() || undefined,
            adsetId: params.adsetId?.trim() || undefined,
            adId: params.adId?.trim() || undefined,
          }
        : undefined;
    const c = this.coalesceTrim('e.campaignId');
    const a = this.coalesceTrim('e.adsetId');
    const d = this.coalesceTrim('e.adId');

    const qbCampaign = this.createAnalyticsFlatQb();
    this.applyMetaFilters(qbCampaign, from, to);
    this.applyMetaAttributionIdFilters(qbCampaign, idFilters);
    qbCampaign.select(c, 'campaignId').addSelect(`''`, 'adsetId').addSelect(`''`, 'adId');
    this.addMetaEventCountSelects(qbCampaign);
    qbCampaign.groupBy(c).orderBy(c, 'ASC');

    const qbAdset = this.createAnalyticsFlatQb();
    this.applyMetaFilters(qbAdset, from, to);
    this.applyMetaAttributionIdFilters(qbAdset, idFilters);
    qbAdset.select(c, 'campaignId').addSelect(a, 'adsetId').addSelect(`''`, 'adId');
    this.addMetaEventCountSelects(qbAdset);
    qbAdset.groupBy(c).addGroupBy(a).orderBy(c, 'ASC').addOrderBy(a, 'ASC');

    const qbAd = this.createAnalyticsFlatQb();
    this.applyMetaFilters(qbAd, from, to);
    this.applyMetaAttributionIdFilters(qbAd, idFilters);
    qbAd.select(c, 'campaignId').addSelect(a, 'adsetId').addSelect(d, 'adId');
    this.addMetaEventCountSelects(qbAd);
    qbAd.groupBy(c).addGroupBy(a).addGroupBy(d).orderBy(c, 'ASC').addOrderBy(a, 'ASC').addOrderBy(d, 'ASC');

    const qbSummary = this.createAnalyticsFlatQb();
    this.applyMetaFilters(qbSummary, from, to);
    this.applyMetaAttributionIdFilters(qbSummary, idFilters);
    this.selectMetaAggregateTotals(qbSummary);

    const [rawCampaigns, rawAdsets, rawAds, rawSummary] = await Promise.all([
      qbCampaign.getRawMany(),
      qbAdset.getRawMany(),
      qbAd.getRawMany(),
      qbSummary.getRawOne(),
    ]);

    const summaryRow = this.normalizeMetaRollupRow({
      ...(rawSummary || {}),
      campaignId: '',
      adsetId: '',
      adId: '',
    });

    return {
      from,
      to,
      filters: {
        campaignId: idFilters?.campaignId ?? null,
        adsetId: idFilters?.adsetId ?? null,
        adId: idFilters?.adId ?? null,
      },
      summary: {
        uniqueSessions: summaryRow.uniqueSessions,
        events: summaryRow.events,
        rowCountCampaign: rawCampaigns.length,
        rowCountAdset: rawAdsets.length,
        rowCountAd: rawAds.length,
      },
      eventTypes: [...META_EVENT_TYPES],
      byCampaign: rawCampaigns.map((r) => this.normalizeMetaRollupRow(r)),
      byAdset: rawAdsets.map((r) => this.normalizeMetaRollupRow(r)),
      byAd: rawAds.map((r) => this.normalizeMetaRollupRow(r)),
    };
  }

  /**
   * Meta-attributed purchase events with order email/phone when the order exists (cap 10k rows).
   */
  async getMetaPurchaseExportRows(params: {
    from?: Date;
    to?: Date;
    campaignId?: string;
    adsetId?: string;
    adId?: string;
  }) {
    const to = params.to ?? new Date();
    const from = params.from ?? new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);
    const idFilters =
      params.campaignId?.trim() || params.adsetId?.trim() || params.adId?.trim()
        ? {
            campaignId: params.campaignId?.trim() || undefined,
            adsetId: params.adsetId?.trim() || undefined,
            adId: params.adId?.trim() || undefined,
          }
        : undefined;

    const qb = this.repo.createQueryBuilder('e');
    this.applyMetaFilters(qb, from, to);
    this.applyMetaAttributionIdFilters(qb, idFilters);
    qb.andWhere('e.type = :pPurchase', { pPurchase: 'purchase' });
    qb.orderBy('e.timestamp', 'ASC');
    qb.take(10000);
    const events = await qb.getMany();

    const orderIds = [
      ...new Set(
        events.map((e) => e.orderId).filter((x): x is string => typeof x === 'string' && String(x).trim() !== ''),
      ),
    ];
    const orderMap = new Map<string, Order>();
    if (orderIds.length) {
      const orders = await this.orderRepo.find({ where: { id: In(orderIds) } });
      for (const o of orders) orderMap.set(o.id, o);
    }

    const sessionIds = [...new Set(events.map((e) => e.sessionId).filter(Boolean))];
    const waBySession = new Map<string, { ts: Date; source: string }[]>();
    if (sessionIds.length) {
      const waRows = await this.repo
        .createQueryBuilder('w')
        .where('w.type = :wa', { wa: 'whatsappOpen' })
        .andWhere('w.sessionId IN (:...sids)', { sids: sessionIds })
        .andWhere('w.timestamp >= :waFrom', { waFrom: from })
        .andWhere('w.timestamp <= :waTo', { waTo: to })
        .orderBy('w.timestamp', 'ASC')
        .getMany();
      for (const w of waRows) {
        const ts = w.timestamp instanceof Date ? w.timestamp : new Date(w.timestamp);
        const source = payloadSource(w.payload);
        const list = waBySession.get(w.sessionId) || [];
        list.push({ ts, source });
        waBySession.set(w.sessionId, list);
      }
    }

    return {
      from,
      to,
      filters: {
        campaignId: idFilters?.campaignId ?? null,
        adsetId: idFilters?.adsetId ?? null,
        adId: idFilters?.adId ?? null,
      },
      rowCount: events.length,
      rows: events.map((e) => {
        const o = e.orderId ? orderMap.get(e.orderId) : undefined;
        const payload =
          e.payload && typeof e.payload === 'object' && !Array.isArray(e.payload)
            ? (e.payload as Record<string, unknown>)
            : {};
        const value = payload['value'];
        const purchaseTs = e.timestamp instanceof Date ? e.timestamp : new Date(e.timestamp);
        const waList = waBySession.get(e.sessionId) || [];
        const waBefore = waList.filter((x) => x.ts.getTime() <= purchaseTs.getTime());
        const waSources = [...new Set(waBefore.map((x) => x.source).filter(Boolean))];
        return {
          timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : String(e.timestamp),
          sessionId: e.sessionId,
          orderId: e.orderId ?? '',
          campaignId: e.campaignId ?? '',
          adsetId: e.adsetId ?? '',
          adId: e.adId ?? '',
          customerEmail: String(o?.email ?? e.customerEmail ?? '').trim(),
          customerName: String(o?.customerName ?? e.customerName ?? '').trim(),
          phone: String(o?.phone ?? '').trim(),
          orderValue: value != null && value !== '' ? String(value) : '',
          whatsappOpensBeforePurchase: waBefore.length,
          whatsappOpenSources: waSources.join('; '),
        };
      }),
    };
  }

  /**
   * Null out Meta attribution columns on matching analytics rows (events stay; they drop out of Meta campaign rollups).
   * Targets are OR’d; each target ANDs the non-empty id fields. Requires campaignId when adsetId or adId is set.
   */
  /** Meta URL attribution stored on the `purchase` analytics row for this order (latest match). */
  async getMetaAttributionForPurchaseOrder(orderId: string): Promise<{
    campaignId: string;
    adsetId: string;
    adId: string;
  } | null> {
    const oid = String(orderId || '').trim();
    if (!oid) return null;
    const row = await this.repo.findOne({
      where: { type: 'purchase', orderId: oid },
      order: { timestamp: 'DESC' },
    });
    if (!row) return null;
    let campaignId = (row.campaignId || '').trim();
    let adsetId = (row.adsetId || '').trim();
    let adId = (row.adId || '').trim();
    if ((!campaignId || !adsetId || !adId) && row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)) {
      const p = row.payload as Record<string, unknown>;
      const g = (k: string) => (typeof p[k] === 'string' ? p[k].trim() : '');
      if (!campaignId) campaignId = g('campaignId') || g('campaign_id');
      if (!adsetId) adsetId = g('adsetId') || g('adset_id');
      if (!adId) adId = g('adId') || g('ad_id');
    }
    if (!campaignId && !adsetId && !adId) return null;
    return { campaignId, adsetId, adId };
  }

  async clearMetaAttributionTargets(dto: MetaAttributionClearDto): Promise<{ updated: number }> {
    const from = new Date(dto.from);
    const to = new Date(dto.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid from or to date');
    }
    if (from > to) throw new BadRequestException('from must be before or equal to to');
    const maxRangeMs = 366 * 24 * 60 * 60 * 1000;
    if (to.getTime() - from.getTime() > maxRangeMs) {
      throw new BadRequestException('Date range must be at most 366 days');
    }

    const targets: { c?: string; a?: string; d?: string }[] = [];
    for (const raw of dto.targets) {
      const c = raw.campaignId?.trim() || undefined;
      const a = raw.adsetId?.trim() || undefined;
      const d = raw.adId?.trim() || undefined;
      if (!c && !a && !d) continue;
      if ((a || d) && !c) {
        throw new BadRequestException('campaignId is required when adsetId or adId is set');
      }
      targets.push({ c, a, d });
    }
    if (!targets.length) {
      throw new BadRequestException('At least one target with campaignId, adsetId, or adId');
    }

    const qb = this.repo.createQueryBuilder().update(AnalyticsEvent).set({
      campaignId: null,
      adsetId: null,
      adId: null,
    });
    qb.where('timestamp >= :metaClrFrom', { metaClrFrom: from });
    qb.andWhere('timestamp <= :metaClrTo', { metaClrTo: to });
    qb.andWhere(
      `((campaignId IS NOT NULL AND TRIM(campaignId) != '') OR (adsetId IS NOT NULL AND TRIM(adsetId) != '') OR (adId IS NOT NULL AND TRIM(adId) != ''))`,
    );

    const orParts: string[] = [];
    targets.forEach((t, i) => {
      const parts: string[] = [];
      if (t.c) {
        qb.setParameter(`mcc${i}`, t.c);
        parts.push(`TRIM(campaignId) = :mcc${i}`);
      }
      if (t.a) {
        qb.setParameter(`mca${i}`, t.a);
        parts.push(`TRIM(adsetId) = :mca${i}`);
      }
      if (t.d) {
        qb.setParameter(`mcd${i}`, t.d);
        parts.push(`TRIM(adId) = :mcd${i}`);
      }
      orParts.push(`(${parts.join(' AND ')})`);
    });
    qb.andWhere(`(${orParts.join(' OR ')})`);

    const result = await qb.execute();
    const updated = typeof result.affected === 'number' ? result.affected : 0;
    return { updated };
  }
}
