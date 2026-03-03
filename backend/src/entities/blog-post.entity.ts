import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BlogCategory } from './blog-category.entity';

@Entity('blog_posts')
export class BlogPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'varchar', length: 500, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  excerpt: string | null;

  @Column({ type: 'longtext', nullable: true })
  body: string | null;

  @Column({ type: 'varchar', length: 100, default: 'standard' })
  template: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  categoryId: string | null;

  @ManyToOne(() => BlogCategory, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category: BlogCategory | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image: string | null;

  @Column({ type: 'int', nullable: true })
  readTimeMinutes: number | null;

  @Column({ type: 'datetime', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'json', nullable: true })
  relatedProductIds: string[] | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  seoTitle: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  seoDescription: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
