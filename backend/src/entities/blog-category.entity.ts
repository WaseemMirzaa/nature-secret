import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('blog_categories')
export class BlogCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  slug: string;
}
