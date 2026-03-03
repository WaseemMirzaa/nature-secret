import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';

@Entity('order_status_timeline')
export class OrderStatusTimeline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  orderId: string;

  @ManyToOne(() => Order, (o) => o.statusTimeline, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  changedAt: Date;

  @Column({ type: 'varchar', length: 20 })
  changedBy: string;
}
