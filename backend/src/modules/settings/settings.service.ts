import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteSetting } from '../../entities/site-setting.entity';

const DEFAULTS: Record<string, string> = {
  contact_whatsapp: '923714165937',
  contact_phone: '+92 3714165937',
  contact_emails: 'support@naturesecret.pk',
  footer_disclaimer:
    'Nature Secret sells cosmetic and body-care products for external use. Website content describes look, feel, and everyday routines—not health or treatment claims.',
  home_hero_intro:
    'Premium botanical skincare and body oils for a calm routine. Nature Secret PX Oil is a relaxing massage oil—comforting neck, muscles, and joints when they feel tired or tight after long days.',
  home_story_label: 'Our story',
  home_story_heading: 'Our journey began at home.',
  home_story_html: `<p>Like many families in Pakistan, we wanted simple, honest care at home. Our father crafted a botanical body oil from traditional plant knowledge and ingredients we already trusted—first for family, then for friends.</p><p>At first, it was only for our own family. Over time, we shared the oil with friends and relatives who wanted a soothing massage ritual. The feedback was overwhelmingly positive—many loved the feel on skin and the quiet evening routine.</p><p>Encouraged by their experiences, we realized this simple formula could support more people in their daily self-care routines. That is how <strong>Nature Secret PX Oil</strong> was born—a relaxing massage oil many use to comfort neck, muscles, and joints as part of their unwind ritual.</p><p>Today, we are proud to share the same heritage-inspired oil with people across Pakistan. Inspired by our belief in natural care, we are now developing a collection of skincare serums and body care for your modern routine.</p><p><strong>From our home to yours: Natural care you can trust.</strong></p>`,
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

  /** DB value only (no DEFAULTS). Missing row → `null`. */
  async getStored(key: string): Promise<string | null> {
    const row = await this.repo.findOne({ where: { key } });
    return row?.value ?? null;
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

  async getContent() {
    const [
      footerDisclaimer,
      productDisclaimerTitleStored,
      productDisclaimerTextStored,
      homeHeroIntro,
      homeStoryLabel,
      homeStoryHeading,
      homeStoryHtml,
    ] = await Promise.all([
      this.get('footer_disclaimer'),
      this.getStored('product_disclaimer_title'),
      this.getStored('product_disclaimer_text'),
      this.get('home_hero_intro'),
      this.get('home_story_label'),
      this.get('home_story_heading'),
      this.get('home_story_html'),
    ]);
    return {
      footerDisclaimer: footerDisclaimer || DEFAULTS.footer_disclaimer,
      /** Optional PDP fallback — empty until set in Admin → Content. */
      productDisclaimerTitle: productDisclaimerTitleStored ?? '',
      productDisclaimerText: productDisclaimerTextStored ?? '',
      homeHeroIntro: homeHeroIntro || DEFAULTS.home_hero_intro,
      homeStoryLabel: homeStoryLabel || DEFAULTS.home_story_label,
      homeStoryHeading: homeStoryHeading || DEFAULTS.home_story_heading,
      homeStoryHtml: homeStoryHtml || DEFAULTS.home_story_html,
    };
  }

  async setContent(data: {
    footerDisclaimer?: string;
    productDisclaimerTitle?: string;
    productDisclaimerText?: string;
    homeHeroIntro?: string;
    homeStoryLabel?: string;
    homeStoryHeading?: string;
    homeStoryHtml?: string;
  }) {
    if (data.footerDisclaimer != null) await this.set('footer_disclaimer', data.footerDisclaimer.trim());
    if (data.productDisclaimerTitle != null) await this.set('product_disclaimer_title', data.productDisclaimerTitle.trim());
    if (data.productDisclaimerText != null) await this.set('product_disclaimer_text', data.productDisclaimerText.trim());
    if (data.homeHeroIntro != null) await this.set('home_hero_intro', data.homeHeroIntro.trim());
    if (data.homeStoryLabel != null) await this.set('home_story_label', data.homeStoryLabel.trim());
    if (data.homeStoryHeading != null) await this.set('home_story_heading', data.homeStoryHeading.trim());
    if (data.homeStoryHtml != null) await this.set('home_story_html', data.homeStoryHtml.trim());
  }
}
