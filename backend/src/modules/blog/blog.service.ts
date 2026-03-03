import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { BlogPost } from '../../entities/blog-post.entity';

@Injectable()
export class BlogService {
  constructor(@InjectRepository(BlogPost) private repo: Repository<BlogPost>) {}

  async findPublished(params: { page?: number; limit?: number }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const [data, total] = await this.repo.findAndCount({
      where: { publishedAt: LessThanOrEqual(new Date()) },
      order: { publishedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async findBySlug(slug: string): Promise<BlogPost> {
    const post = await this.repo.findOne({ where: { slug } });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async findOne(id: string): Promise<BlogPost> {
    const post = await this.repo.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }
}
