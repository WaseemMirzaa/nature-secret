import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  productId: string;

  @ManyToOne(() => Product, (p) => p.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  volume: string | null;

  @Column({ type: 'int', default: 0 })
  price: number;

  @Column({ type: 'int', nullable: true })
  compareAtPrice: number | null;

  /** First image URL (legacy); also set from images[0] when saving. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  image: string | null;

  /** Multiple image URLs for this variant. */
  @Column({ type: 'json', nullable: true })
  images: string[] | null;
}
