import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Customer } from './customer.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatusTimeline } from './order-status-timeline.entity';
import { encryptedTransformer } from '../common/encryption/encryption.util';

@Entity('orders')
export class Order {
  @PrimaryColumn({ type: 'varchar', length: 8 })
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  customerId: string | null;

  @ManyToOne(() => Customer, (c) => c.orders, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customerId' })
  customer: Customer | null;

  @Column({ type: 'varchar', length: 2000, transformer: encryptedTransformer, nullable: true })
  customerName: string | null;

  @Column({ type: 'varchar', length: 2000, transformer: encryptedTransformer, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 2000, transformer: encryptedTransformer, nullable: true })
  phone: string | null;

  @Column({ type: 'text', transformer: encryptedTransformer, nullable: true })
  address: string | null;

  @Column({ type: 'int', default: 0 })
  total: number;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: string;

  @Column({ type: 'varchar', length: 50, default: 'cash_on_delivery' })
  paymentMethod: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  dispatchedAt: Date | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  confirmationCode: string | null;

  /** Set when admin sent NS_EV_ORDER_VOID to Meta CAPI (fake / invalid purchase signal). */
  @Column({ type: 'datetime', nullable: true })
  metaVoidSentAt: Date | null;

  @OneToMany(() => OrderItem, (i) => i.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(() => OrderStatusTimeline, (t) => t.order, { cascade: true })
  statusTimeline: OrderStatusTimeline[];
}
