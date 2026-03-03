import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  orderId: string;

  @ManyToOne(() => Order, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'varchar', length: 36 })
  productId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  variantId: string | null;

  @Column({ type: 'int', default: 1 })
  qty: number;

  @Column({ type: 'int', default: 0 })
  price: number;
}
