import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('blog_templates')
export class BlogTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  slug: string;
}
