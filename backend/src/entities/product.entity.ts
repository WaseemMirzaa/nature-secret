import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Category } from './category.entity';
import { ProductVariant } from './product-variant.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Plain text for SEO (meta title, headings). */
  @Column({ type: 'varchar', length: 2000 })
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

  /** Description; can contain HTML (p, strong, ul, li, a, etc.). Rendered as HTML on frontend with sanitization. */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'json', nullable: true })
  benefits: string[] | null;

  @Column({ type: 'json', nullable: true })
  images: string[] | null;

  @Column({ type: 'json', nullable: true })
  imageAlts: string[] | null;

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

  @Column({ type: 'int', default: 0 })
  manufacturingCost: number;

  @Column({ type: 'int', default: 0 })
  boxPrice: number;

  @Column({ type: 'int', default: 0 })
  stickerPrice: number;

  @Column({ type: 'json', nullable: true })
  faq: Array<{ q: string; a: string }> | null;

  @Column({ type: 'boolean', default: false })
  showDisclaimer: boolean;

  @Column({ type: 'varchar', length: 120, nullable: true })
  disclaimerTitle: string | null;

  @Column({ type: 'text', nullable: true })
  disclaimerText: string | null;

  @Column({ type: 'json', nullable: true })
  disclaimerItems: string[] | null;

  @Column({ type: 'json', nullable: true })
  productBadges: Array<{ label: string; imageUrl: string; href?: string }> | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => ProductVariant, (v) => v.product, { cascade: true })
  variants: ProductVariant[];
}
