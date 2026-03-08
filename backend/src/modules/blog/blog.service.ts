import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { BlogPost } from '../../entities/blog-post.entity';

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);

  constructor(@InjectRepository(BlogPost) private repo: Repository<BlogPost>) {}

  async findPublished(params: { page?: number; limit?: number }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    try {
      const [data, total] = await this.repo.findAndCount({
        where: { publishedAt: LessThanOrEqual(new Date()) },
        order: { publishedAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return { data, total, page, limit };
    } catch (e) {
      this.logger.error(`findPublished failed: ${e?.message || e}. Check blog_posts table.`);
      return { data: [], total: 0, page, limit };
    }
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
