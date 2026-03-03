import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AnalyticsEvent } from '../../entities/analytics-event.entity';

@Injectable()
export class AnalyticsService {
  constructor(@InjectRepository(AnalyticsEvent) private repo: Repository<AnalyticsEvent>) {}

  async track(dto: {
    type: string;
    sessionId: string;
    path?: string;
    productId?: string;
    orderId?: string;
    customerEmail?: string;
    customerName?: string;
    payload?: Record<string, unknown>;
  }) {
    const event = this.repo.create({
      type: dto.type,
      sessionId: dto.sessionId,
      path: dto.path ?? null,
      productId: dto.productId ?? null,
      orderId: dto.orderId ?? null,
      customerEmail: dto.customerEmail ?? null,
      customerName: dto.customerName ?? null,
      payload: dto.payload ?? null,
    });
    await this.repo.save(event);
    return event;
  }

  async getSessions(params: { from?: Date; to?: Date; page?: number; limit?: number }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const qb = this.repo
      .createQueryBuilder('e')
      .select('e.sessionId')
      .addSelect('MIN(e.timestamp)', 'first')
      .addSelect('MAX(e.timestamp)', 'last')
      .addSelect('COUNT(*)', 'count')
      .groupBy('e.sessionId');
    if (params.from) qb.andWhere('e.timestamp >= :from', { from: params.from });
    if (params.to) qb.andWhere('e.timestamp <= :to', { to: params.to });
    const total = await qb.getCount();
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

  async getLoggedInVisitors(params: { from?: Date; to?: Date; page?: number; limit?: number }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const qb = this.repo
      .createQueryBuilder('e')
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
    const total = await qb.getCount();
    const raw = await qb
      .orderBy('lastSeen', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();
    return { data: raw, total, page, limit };
  }
}
