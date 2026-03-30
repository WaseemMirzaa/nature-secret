/**
 * Push notifications: Firebase Cloud Messaging (FCM) for order alerts.
 */
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { FirebaseService } from '../../common/firebase/firebase.service';

const FCM_TOKENS_FILENAME = 'fcm-tokens.json';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private fcmTokens: string[] = [];
  private filePath: string;

  constructor(private firebaseService: FirebaseService) {
    const dataDir = process.env.PUSH_DATA_DIR || path.join(process.cwd(), 'data');
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {}
    this.filePath = path.join(dataDir, FCM_TOKENS_FILENAME);

    this.load();
  }

  private load() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const data = JSON.parse(raw);
      this.fcmTokens = Array.isArray(data?.tokens) ? data.tokens : [];
    } catch {
      this.fcmTokens = [];
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify({ tokens: this.fcmTokens }, null, 2), 'utf8');
    } catch (e) {
      this.logger.warn(`Failed to save FCM tokens: ${(e as Error)?.message || e}`);
    }
  }

  addFcmToken(token: string) {
    if (!token || typeof token !== 'string') return;
    const t = token.trim();
    if (!t) return;
    if (!this.fcmTokens.includes(t)) {
      this.fcmTokens.push(t);
      this.save();
    }
  }

  removeFcmToken(token: string) {
    this.fcmTokens = this.fcmTokens.filter((x) => x !== token.trim());
    this.save();
  }

  async notifyNewOrder(order: { id: string; total?: number; customerName?: string | null }) {
    const total = order.total != null ? `PKR ${(order.total / 100).toLocaleString()}` : '';
    const title = 'New order';
    const body = [order.customerName || 'Customer', total].filter(Boolean).join(' · ') || order.id;
    const url = `/admin/orders/${order.id}`;

    await this.sendToAllFcm({ title, body, url });
  }

  async sendToAllFcm(payload: { title: string; body?: string; url?: string }) {
    const messaging = this.firebaseService.getMessaging();
    if (!messaging) {
      this.logger.warn('FCM skipped: Firebase Admin not configured (FIREBASE_* env).');
      return;
    }
    if (this.fcmTokens.length === 0) {
      this.logger.warn('FCM skipped: no admin device tokens (enable notifications on Admin → Order notifications).');
      return;
    }
    const data: Record<string, string> = payload.url ? { url: payload.url } : {};
    const results = await Promise.allSettled(
      this.fcmTokens.map((token) =>
        messaging.send({
          token,
          notification: { title: payload.title, body: payload.body || '' },
          ...(Object.keys(data).length > 0 && { data }),
          android: {
            priority: 'high',
            notification: {
              channelId: 'orders',
              priority: 'max',
              defaultSound: true,
              visibility: 'public',
            },
          },
          webpush: {
            headers: {
              Urgency: 'high',
              TTL: '2419200',
            },
            notification: {
              requireInteraction: true,
              renotify: true,
              tag: payload.url ? `order-${payload.url}` : 'new-order',
              vibrate: [300, 150, 300],
            },
            ...(payload.url && { fcmOptions: { link: payload.url } }),
          },
        }),
      ),
    );
    const toRemove: string[] = [];
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        this.logger.warn(`FCM send failed for token ${i}: ${(r.reason as Error)?.message || r.reason}`);
        if (this.fcmTokens[i]) toRemove.push(this.fcmTokens[i]);
      }
    });
    toRemove.forEach((t) => this.removeFcmToken(t));
  }
}
