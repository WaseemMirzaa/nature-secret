import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  productId: string | null;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product | null;

  @Column({ type: 'varchar', length: 255 })
  authorName: string;

  @Column({ type: 'int', default: 5 })
  rating: number;

  @Column({ type: 'text' })
  body: string;

  /** Collection/category label (legacy + user-generated). */
  @Column({ type: 'varchar', length: 50, default: 'quality' })
  collection: string;

  @Column({ type: 'boolean', default: true })
  approved: boolean;

  /** Curated UGC: photos / video / audio URLs (admin + user). */
  @Column({ type: 'json', nullable: true })
  media: Array<{ type: 'image' | 'video' | 'audio'; url: string }> | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
