import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { WhatsAppService } from './whatsapp.service';
import { WebhookSecretGuard } from '../../common/guards/webhook-secret.guard';

@Controller('webhooks')
export class NotificationsController {
  constructor(private whatsapp: WhatsAppService) {}

  @UseGuards(WebhookSecretGuard)
  @Post('whatsapp')
  async whatsappIncoming(@Req() req: Request, @Res() res: Response, @Body() body: Record<string, string>) {
    const from = body?.From?.replace('whatsapp:', '') || '';
    const bodyText = body?.Body ?? '';
    const orderId = await this.whatsapp.handleIncomingMessage(from, bodyText);
    res.set('Content-Type', 'text/xml');
    res.send(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
    );
  }
}
