import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(@InjectRepository(Category) private repo: Repository<Category>) {}

  async findAll(): Promise<Category[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Category | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.repo.findOne({ where: { slug } });
  }
}
