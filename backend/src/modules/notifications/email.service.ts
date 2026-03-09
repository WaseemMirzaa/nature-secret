import { Injectable } from '@nestjs/common';
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

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS;
    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    }
  }

  async sendOrderConfirmation(to: string, order: OrderForEmail, itemsSummary: string) {
    if (!this.transporter || !to) return;
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
      await this.transporter.sendMail({
        from: process.env.GMAIL_USER,
        to,
        subject: `Order confirmed – Nature Secret #${order.id.slice(0, 8)}`,
        text,
        html,
      });
    } catch (e) {
      console.error('Email send failed:', e);
    }
  }

  async sendPasswordReset(to: string, resetLink: string) {
    if (!this.transporter || !to) return;
    try {
      const html = renderResetPasswordEmail(resetLink);
      const text = `Reset your password – Nature Secret\n\nUse this link (valid 1 hour):\n\n${resetLink}\n\nIf you didn't request this, ignore this email.`;
      await this.transporter.sendMail({
        from: process.env.GMAIL_USER,
        to,
        subject: 'Reset your password – Nature Secret',
        text,
        html,
      });
    } catch (e) {
      console.error('Password reset email failed:', e);
    }
  }
}
