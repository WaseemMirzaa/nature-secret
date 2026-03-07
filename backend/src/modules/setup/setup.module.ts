import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUser } from '../../entities/admin-user.entity';
import { Category } from '../../entities/category.entity';
import { HeroSlide } from '../../entities/hero-slide.entity';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminUser, Category, HeroSlide])],
  controllers: [SetupController],
  providers: [SetupService],
})
export class SetupModule {}
