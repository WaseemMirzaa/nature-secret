import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteSetting } from '../../entities/site-setting.entity';

const DEFAULTS: Record<string, string> = {
  contact_whatsapp: '923714165937',
  contact_phone: '+92 3714165937',
  contact_emails: 'support@naturesecret.pk',
};

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SiteSetting) private repo: Repository<SiteSetting>,
  ) {}

  async get(key: string): Promise<string | null> {
    const row = await this.repo.findOne({ where: { key } });
    return row?.value ?? DEFAULTS[key] ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    await this.repo.upsert({ key, value }, ['key']);
  }

  async getContact(): Promise<{ whatsappNumber: string; phone: string; emails: string }> {
    const [whatsappNumber, phone, emails] = await Promise.all([
      this.get('contact_whatsapp'),
      this.get('contact_phone'),
      this.get('contact_emails'),
    ]);
    return {
      whatsappNumber: whatsappNumber || DEFAULTS.contact_whatsapp,
      phone: phone || DEFAULTS.contact_phone,
      emails: emails || DEFAULTS.contact_emails,
    };
  }

  async setContact(data: { whatsappNumber?: string; phone?: string; emails?: string }): Promise<void> {
    if (data.whatsappNumber != null) await this.set('contact_whatsapp', data.whatsappNumber.replace(/\D/g, ''));
    if (data.phone != null) await this.set('contact_phone', data.phone);
    if (data.emails != null) await this.set('contact_emails', data.emails);
  }
}
