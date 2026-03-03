import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../entities/order.entity';
import { Product } from '../../entities/product.entity';
import { Customer } from '../../entities/customer.entity';
import { BlogPost } from '../../entities/blog-post.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Product, Customer, BlogPost]),
    OrdersModule,
    ProductsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
