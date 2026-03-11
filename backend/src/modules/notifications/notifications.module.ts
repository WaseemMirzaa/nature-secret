import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../entities/order.entity';
import { OrderStatusTimeline } from '../../entities/order-status-timeline.entity';
import { EmailService } from './email.service';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppLinkService } from './whatsapp-link.service';
import { PushService } from './push.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderStatusTimeline])],
  controllers: [NotificationsController],
  providers: [EmailService, WhatsAppService, WhatsAppLinkService, PushService],
  exports: [EmailService, WhatsAppService, WhatsAppLinkService, PushService],
})
export class NotificationsModule {}
