import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Product } from './product.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  /** Short ID for ads taxonomy (custom content category id). */
  @Column({ type: 'varchar', length: 32, nullable: true, unique: true })
  advertisingId: string | null;

  @OneToMany(() => Product, (p) => p.category)
  products: Product[];
}
