import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { OrderStatusTimeline } from '../../entities/order-status-timeline.entity';
import { Customer } from '../../entities/customer.entity';
import { Product } from '../../entities/product.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderStatusTimeline, Customer, Product]),
    NotificationsModule,
    AnalyticsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
