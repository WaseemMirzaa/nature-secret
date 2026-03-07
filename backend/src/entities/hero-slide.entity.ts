import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('hero_slides')
export class HeroSlide {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 1024 })
  imageUrl: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  alt: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  title: string;

  @Column({ type: 'varchar', length: 512, default: '' })
  href: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
