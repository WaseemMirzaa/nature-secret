import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import * as nodemailer from 'nodemailer';
import { renderOrderConfirmationEmail } from './templates/order-confirmation.template';
import { renderResetPasswordEmail } from './templates/reset-password.template';

interface OrderForEmail {
  id: string;
  total: number;
  confirmationCode?: string | null;
  customerName?: string | null;
  createdAt?: Date | string | null;
  paymentMethod?: string | null;
  address?: string | null;
}

type SendStrategy = 'gmail-api' | 'nodemailer' | null;

function encodeRfc2047(value: string): string {
  return '=?UTF-8?B?' + Buffer.from(value, 'utf8').toString('base64') + '?=';
}

function buildMime(from: string, to: string, subject: string, text: string, html: string): Buffer {
  const boundary = '----=_Part_' + Math.random().toString(36).slice(2);
  const subj = /[\x00-\x1f\x7f-\xff]/.test(subject) ? encodeRfc2047(subject) : subject;
  const lines = [
    'From: ' + from,
    'To: ' + to,
    'Subject: ' + subj,
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="' + boundary + '"',
    '',
    '--' + boundary,
    'Content-Type: text/plain; charset=utf-8',
    '',
    text,
    '--' + boundary,
    'Content-Type: text/html; charset=utf-8',
    '',
    html,
    '--' + boundary + '--',
  ];
  return Buffer.from(lines.join('\r\n'), 'utf8');
}

function toBase64Url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

@Injectable()
export class EmailService {
  private strategy: SendStrategy = null;
  private transporter: nodemailer.Transporter | null = null;
  private gmail: ReturnType<typeof google.gmail> | null = null;
  private fromEmail: string = '';

  constructor() {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS;
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

    if (clientId && clientSecret && refreshToken && user) {
      this.fromEmail = user;
      const oauth2 = new google.auth.OAuth2(clientId, clientSecret, 'https://developers.google.com/oauthplayground');
      oauth2.setCredentials({ refresh_token: refreshToken });
      this.gmail = google.gmail({ version: 'v1', auth: oauth2 });
      this.strategy = 'gmail-api';
      return;
    }

    if (user && pass) {
      this.fromEmail = user;
      const host = process.env.SMTP_HOST || 'smtp.gmail.com';
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT) || 2525,
        secure: false,
        auth: { user, pass },
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 25000,
      });
      this.strategy = 'nodemailer';
    }
  }

  private async send(from: string, to: string, subject: string, text: string, html: string): Promise<void> {
    if (this.strategy === 'gmail-api' && this.gmail) {
      const raw = toBase64Url(buildMime(from, to, subject, text, html));
      await this.gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
      return;
    }
    if (this.strategy === 'nodemailer' && this.transporter) {
      await this.transporter.sendMail({ from, to, subject, text, html });
    }
  }

  async sendOrderConfirmation(to: string, order: OrderForEmail, itemsSummary: string) {
    if (!this.strategy || !to) return;
    try {
      const totalFormatted = `PKR ${(order.total / 100).toLocaleString()}`;
      const createdAtFormatted = order.createdAt
        ? new Date(order.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
        : '—';
      const itemsSummaryHtml = itemsSummary
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
        .join('<br>');
      const html = renderOrderConfirmationEmail({
        orderId: order.id,
        customerName: order.customerName ?? null,
        totalFormatted,
        confirmationCode: order.confirmationCode ?? null,
        createdAtFormatted,
        paymentMethod: order.paymentMethod || 'cash_on_delivery',
        address: order.address ?? null,
        itemsSummaryHtml: itemsSummaryHtml || '—',
      });
      const text = `Thank you for your order.\n\nOrder ID: ${order.id}\nConfirmation code: ${order.confirmationCode ?? '—'}\nTotal: ${totalFormatted}\n\n${itemsSummary}\n\nWe will notify you when your order is shipped.`;
      const subject = `Order confirmed – Nature Secret #${order.id}`;
      await this.send(this.fromEmail, to, subject, text, html);
    } catch (e) {
      console.error('Email send failed:', e);
    }
  }

  async sendPasswordReset(to: string, resetLink: string) {
    if (!this.strategy || !to) return;
    try {
      const html = renderResetPasswordEmail(resetLink);
      const text = `Reset your password – Nature Secret\n\nUse this link (valid 1 hour):\n\n${resetLink}\n\nIf you didn't request this, ignore this email.`;
      await this.send(this.fromEmail, to, 'Reset your password – Nature Secret', text, html);
    } catch (e) {
      console.error('Password reset email failed:', e);
    }
  }
}
