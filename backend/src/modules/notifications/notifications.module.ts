import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../entities/order.entity';
import { OrderStatusTimeline } from '../../entities/order-status-timeline.entity';
import { EmailService } from './email.service';
import { WhatsAppService } from './whatsapp.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderStatusTimeline])],
  controllers: [NotificationsController],
  providers: [EmailService, WhatsAppService],
  exports: [EmailService, WhatsAppService],
})
export class NotificationsModule {}
