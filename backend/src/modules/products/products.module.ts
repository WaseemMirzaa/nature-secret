import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../../entities/product.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductVariant]), ReviewsModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
