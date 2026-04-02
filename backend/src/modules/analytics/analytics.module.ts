import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsEvent } from '../../entities/analytics-event.entity';
import { Order } from '../../entities/order.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { MetaConversionsService } from './meta-conversions.service';

@Module({
  imports: [TypeOrmModule.forFeature([AnalyticsEvent, Order])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, MetaConversionsService],
  exports: [AnalyticsService, MetaConversionsService],
})
export class AnalyticsModule {}
