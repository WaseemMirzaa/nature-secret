import { Injectable, OnModuleInit } from '@nestjs/common';
import { join } from 'path';
import * as QRCode from 'qrcode';

const AUTH_DIR = join(process.cwd(), 'data', 'wa_auth');

@Injectable()
export class WhatsAppLinkService implements OnModuleInit {
  private sock: Awaited<ReturnType<typeof import('@whiskeysockets/baileys').makeWASocket>> | null = null;
  private qrDataUrl: string | null = null;
  private linked = false;
  private initPromise: Promise<void> | null = null;

  async onModuleInit() {
    this.start().catch((e) => console.error('[WhatsAppLink] init error', e));
  }

  private async start() {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.connect();
    return this.initPromise;
  }

  private async connect() {
    const baileys = await import('@whiskeysockets/baileys');
    const { state, saveCreds } = await baileys.useMultiFileAuthState(AUTH_DIR);
    this.qrDataUrl = null;

    const sock = baileys.makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: {
        level: 'silent',
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        child: () => ({ trace: () => {}, debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }),
      } as any,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        try {
          this.qrDataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 2 });
        } catch {
          this.qrDataUrl = null;
        }
      }
      if (connection === 'open') {
        this.linked = true;
        this.qrDataUrl = null;
        this.sock = sock;
      }
      if (connection === 'close') {
        this.sock = null;
        this.linked = false;
        const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode;
        if (statusCode === 515 || statusCode === 401) {
          this.initPromise = null;
          setTimeout(() => this.connect(), 2000);
        }
      }
    });
  }

  getStatus(): { linked: boolean } {
    return { linked: this.linked && !!this.sock };
  }

  async getQR(): Promise<{ qr: string | null; linked: boolean }> {
    await this.start();
    if (this.linked) return { qr: null, linked: true };
    return { qr: this.qrDataUrl, linked: false };
  }

  private toJid(phone: string): string {
    const digits = (phone || '').replace(/\D/g, '');
    const normalized = digits.startsWith('92') && digits.length >= 12 ? digits : `92${digits.slice(-10)}`;
    return `${normalized}@s.whatsapp.net`;
  }

  async sendOrderConfirmation(phone: string | null, orderId: string, confirmationCode: string | null): Promise<boolean> {
    if (!phone || !this.sock || !this.linked) return false;
    const jid = this.toJid(phone);
    const codeMsg = confirmationCode ? ` Reply YES to confirm your order.` : '';
    const text = `Nature Secret: Your order #${orderId} has been placed.${codeMsg}`;
    try {
      await this.sock.sendMessage(jid, { text });
      return true;
    } catch (e) {
      console.error('[WhatsAppLink] send failed', e);
      return false;
    }
  }
}
