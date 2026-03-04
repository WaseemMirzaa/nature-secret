import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class WebhookSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const secret = process.env.WEBHOOK_SECRET || process.env.WHATSAPP_WEBHOOK_SECRET;
    if (!secret) return true;
    const token = req.headers['x-webhook-secret'] ?? (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
    if (!token || token !== secret) throw new UnauthorizedException('Invalid webhook secret');
    return true;
  }
}
