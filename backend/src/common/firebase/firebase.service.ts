import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

export interface FirebaseDecodedToken {
  uid: string;
  email?: string;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private app: admin.app.App | null = null;

  onModuleInit() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) {
      return;
    }
    try {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } catch (e) {
      console.warn('Firebase Admin init skipped:', (e as Error)?.message);
    }
  }

  async verifyIdToken(idToken: string): Promise<FirebaseDecodedToken> {
    if (!this.app) throw new Error('Firebase not configured');
    const decoded = await admin.auth().verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email ?? undefined,
    };
  }

  getMessaging(): admin.messaging.Messaging | null {
    return this.app ? admin.messaging() : null;
  }
}
