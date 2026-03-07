import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HeroSlide } from '../../entities/hero-slide.entity';
import { CreateSlideDto } from './dto/slide.dto';
import { UpdateSlideDto } from './dto/slide.dto';

@Injectable()
export class SliderService {
  constructor(
    @InjectRepository(HeroSlide)
    private slideRepo: Repository<HeroSlide>,
  ) {}

  async findAll(): Promise<HeroSlide[]> {
    return this.slideRepo.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
  }

  async findOne(id: string): Promise<HeroSlide | null> {
    return this.slideRepo.findOne({ where: { id } });
  }

  async create(dto: CreateSlideDto): Promise<HeroSlide> {
    const slide = this.slideRepo.create({
      imageUrl: dto.imageUrl,
      alt: dto.alt ?? '',
      title: dto.title ?? '',
      href: dto.href ?? '',
      sortOrder: dto.sortOrder ?? (await this.slideRepo.count()),
    });
    return this.slideRepo.save(slide);
  }

  async update(id: string, dto: UpdateSlideDto): Promise<HeroSlide> {
    const slide = await this.slideRepo.findOne({ where: { id } });
    if (!slide) throw new NotFoundException('Slide not found');
    if (dto.imageUrl !== undefined) slide.imageUrl = dto.imageUrl;
    if (dto.alt !== undefined) slide.alt = dto.alt;
    if (dto.title !== undefined) slide.title = dto.title;
    if (dto.href !== undefined) slide.href = dto.href;
    if (dto.sortOrder !== undefined) slide.sortOrder = dto.sortOrder;
    return this.slideRepo.save(slide);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.slideRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
