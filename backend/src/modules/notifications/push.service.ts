import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import * as fs from 'fs';
import * as path from 'path';

export interface PushSubscriptionRecord {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  label?: string;
  createdAt: string;
}

const FILENAME = 'push-subscriptions.json';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private subscriptions: PushSubscriptionRecord[] = [];
  private filePath: string;
  private vapidReady = false;

  constructor() {
    const dataDir = process.env.PUSH_DATA_DIR || path.join(process.cwd(), 'data');
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {}
    this.filePath = path.join(dataDir, FILENAME);
    this.load();
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (publicKey && privateKey) {
      webpush.setVapidDetails('mailto:support@naturesecret.com', publicKey, privateKey);
      this.vapidReady = true;
    } else {
      this.logger.warn('VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY not set; push notifications disabled.');
    }
  }

  private load() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      this.subscriptions = JSON.parse(raw);
      if (!Array.isArray(this.subscriptions)) this.subscriptions = [];
    } catch {
      this.subscriptions = [];
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.subscriptions, null, 2), 'utf8');
    } catch (e) {
      this.logger.warn(`Failed to save push subscriptions: ${e?.message || e}`);
    }
  }

  getVapidPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  }

  addSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string }; label?: string }) {
    const existing = this.subscriptions.findIndex((s) => s.endpoint === sub.endpoint);
    const record: PushSubscriptionRecord = {
      endpoint: sub.endpoint,
      keys: sub.keys,
      label: sub.label,
      createdAt: new Date().toISOString(),
    };
    if (existing >= 0) this.subscriptions[existing] = record;
    else this.subscriptions.push(record);
    this.save();
  }

  removeSubscription(endpoint: string) {
    this.subscriptions = this.subscriptions.filter((s) => s.endpoint !== endpoint);
    this.save();
  }

  async notifyNewOrder(order: { id: string; total?: number; customerName?: string | null }) {
    const total = order.total != null ? `PKR ${(order.total / 100).toLocaleString()}` : '';
    const title = 'New order';
    const body = [order.customerName || 'Customer', total].filter(Boolean).join(' · ') || order.id;
    await this.sendToAll({ title, body, url: `/admin/orders/${order.id}` });
  }

  async sendToAll(payload: { title: string; body?: string; icon?: string; url?: string }) {
    if (!this.vapidReady || this.subscriptions.length === 0) return;
    const payloadStr = JSON.stringify(payload);
    const results = await Promise.allSettled(
      this.subscriptions.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payloadStr,
          { TTL: 60 },
        ),
      ),
    );
    const toRemove: string[] = [];
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        const err = r.reason as { statusCode?: number; message?: string };
        if (err?.statusCode === 410 || err?.statusCode === 404) toRemove.push(this.subscriptions[i]?.endpoint);
        else this.logger.warn(`Push failed: ${err?.message || err}`);
      }
    });
    toRemove.forEach((ep) => this.removeSubscription(ep));
  }
}
