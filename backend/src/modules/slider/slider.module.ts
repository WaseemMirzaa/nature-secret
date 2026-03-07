import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HeroSlide } from '../../entities/hero-slide.entity';
import { SliderService } from './slider.service';
import { SliderController } from './slider.controller';

@Module({
  imports: [TypeOrmModule.forFeature([HeroSlide])],
  controllers: [SliderController],
  providers: [SliderService],
  exports: [SliderService],
})
export class SliderModule {}
