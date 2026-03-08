import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

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

  async sendOrderConfirmation(to: string, order: { id: string; total: number; confirmationCode?: string | null }, itemsSummary: string) {
    if (!this.transporter || !to) return;
    try {
      await this.transporter.sendMail({
        from: process.env.GMAIL_USER,
        to,
        subject: `Order confirmed – Nature Secret #${order.id}`,
        text: `Thank you for your order.\n\nOrder ID: ${order.id}\nTotal: PKR ${(order.total / 100).toLocaleString()}\n\n${itemsSummary}\n\nWe will notify you when your order is shipped.`,
        html: `<p>Thank you for your order.</p><p><strong>Order ID:</strong> ${order.id}</p><p><strong>Total:</strong> PKR ${(order.total / 100).toLocaleString()}</p><p>${itemsSummary.replace(/\n/g, '<br>')}</p><p>We will notify you when your order is shipped.</p>`,
      });
    } catch (e) {
      console.error('Email send failed:', e);
    }
  }

  async sendPasswordReset(to: string, resetLink: string) {
    if (!this.transporter || !to) return;
    try {
      await this.transporter.sendMail({
        from: process.env.GMAIL_USER,
        to,
        subject: 'Reset your password – Nature Secret',
        text: `Use this link to reset your password (valid 1 hour):\n\n${resetLink}`,
        html: `<p>Use this link to reset your password (valid 1 hour):</p><p><a href="${resetLink}">${resetLink}</a></p>`,
      });
    } catch (e) {
      console.error('Password reset email failed:', e);
    }
  }
}
