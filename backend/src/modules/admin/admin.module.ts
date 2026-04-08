import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../entities/order.entity';
import { Product } from '../../entities/product.entity';
import { Customer } from '../../entities/customer.entity';
import { BlogPost } from '../../entities/blog-post.entity';
import { BlogCategory } from '../../entities/blog-category.entity';
import { AdminController } from './admin.controller';
import { AdminProductUploadController } from './admin-product-upload.controller';
import { AdminBlogUploadController } from './admin-blog-upload.controller';
import { AdminService } from './admin.service';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { SupportModule } from '../support/support.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Product, Customer, BlogPost, BlogCategory]),
    OrdersModule,
    ProductsModule,
    NotificationsModule,
    SettingsModule,
    SupportModule,
    AnalyticsModule,
    CategoriesModule,
  ],
  controllers: [AdminController, AdminProductUploadController, AdminBlogUploadController],
  providers: [AdminService],
})
export class AdminModule {}
