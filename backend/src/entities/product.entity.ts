import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Category } from './category.entity';
import { ProductVariant } from './product-variant.entity';
import { encryptedTransformer } from '../common/encryption/encryption.util';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 2000, transformer: encryptedTransformer })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 36 })
  categoryId: string;

  @ManyToOne(() => Category, (c) => c.products, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ type: 'varchar', length: 100, nullable: true })
  badge: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  badgeSub: string | null;

  @Column({ type: 'int', default: 0 })
  price: number;

  @Column({ type: 'int', nullable: true })
  compareAtPrice: number | null;

  @Column({ type: 'text', transformer: encryptedTransformer, nullable: true })
  description: string | null;

  @Column({ type: 'json', nullable: true })
  benefits: string[] | null;

  @Column({ type: 'json', nullable: true })
  images: string[] | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  reviewCount: number;

  @Column({ type: 'int', default: 0 })
  inventory: number;

  @Column({ type: 'boolean', default: false })
  isBestseller: boolean;

  @Column({ type: 'boolean', default: false })
  outOfStock: boolean;

  @Column({ type: 'json', nullable: true })
  faq: Array<{ q: string; a: string }> | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => ProductVariant, (v) => v.product, { cascade: true })
  variants: ProductVariant[];
}
