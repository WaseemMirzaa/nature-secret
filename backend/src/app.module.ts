import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CustomersModule } from './modules/customers/customers.module';
import { BlogModule } from './modules/blog/blog.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EventsModule } from './modules/events/events.module';
import { SliderModule } from './modules/slider/slider.module';
import { SetupModule } from './modules/setup/setup.module';
import { ReviewsModule } from './modules/reviews/reviews.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      username: process.env.MYSQL_USER || 'nature_secret',
      password: process.env.MYSQL_PASSWORD || 'nature_secret_dev',
      database: process.env.MYSQL_DATABASE || 'nature_secret',
      autoLoadEntities: true,
      synchronize: true,
      charset: 'utf8mb4',
    }),
    AuthModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    CustomersModule,
    BlogModule,
    AnalyticsModule,
    AdminModule,
    NotificationsModule,
    EventsModule,
    SliderModule,
    SetupModule,
    ReviewsModule,
  ],
})
export class AppModule {}
