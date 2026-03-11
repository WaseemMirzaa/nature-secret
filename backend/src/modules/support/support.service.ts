import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket } from '../../entities/support-ticket.entity';
import { CreateSupportTicketDto } from './dto/create-ticket.dto';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private repo: Repository<SupportTicket>,
  ) {}

  async create(dto: CreateSupportTicketDto, customerId?: string): Promise<SupportTicket> {
    const ticket = this.repo.create({
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      subject: dto.subject.trim(),
      message: dto.message.trim(),
      customerId: customerId ?? dto.customerId ?? null,
      status: 'open',
    });
    return this.repo.save(ticket);
  }

  async findByCustomerId(customerId: string, params?: { limit?: number; offset?: number }): Promise<SupportTicket[]> {
    const limit = Math.min(100, Math.max(1, params?.limit ?? 50));
    const offset = Math.max(0, params?.offset ?? 0);
    return this.repo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async findOneForCustomer(id: string, customerId: string): Promise<SupportTicket> {
    const ticket = await this.repo.findOne({ where: { id } });
    if (!ticket) throw new ForbiddenException('Ticket not found');
    if (ticket.customerId !== customerId) throw new ForbiddenException('Not your ticket');
    return ticket;
  }

  async findAllForAdmin(params?: { status?: string; limit?: number; offset?: number }): Promise<SupportTicket[]> {
    const limit = Math.min(100, Math.max(1, params?.limit ?? 50));
    const offset = Math.max(0, params?.offset ?? 0);
    const qb = this.repo.createQueryBuilder('t').orderBy('t.createdAt', 'DESC').take(limit).skip(offset);
    if (params?.status) qb.andWhere('t.status = :status', { status: params.status });
    return qb.getMany();
  }

  async findOneForAdmin(id: string): Promise<SupportTicket | null> {
    return this.repo.findOne({ where: { id } });
  }

  async updateByAdmin(
    id: string,
    data: { status?: string; adminReply?: string },
  ): Promise<SupportTicket> {
    const ticket = await this.repo.findOne({ where: { id } });
    if (!ticket) throw new ForbiddenException('Ticket not found');
    if (data.status) ticket.status = data.status;
    if (data.adminReply !== undefined) {
      ticket.adminReply = data.adminReply?.trim() || null;
      ticket.repliedAt = data.adminReply?.trim() ? new Date() : null;
    }
    return this.repo.save(ticket);
  }
}
