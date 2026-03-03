import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { encryptedTransformer } from '../common/encryption/encryption.util';

@Entity('analytics_events')
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  type: string;

  @Column({ type: 'varchar', length: 100 })
  sessionId: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  path: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  productId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  orderId: string | null;

  @Column({ type: 'varchar', length: 2000, transformer: encryptedTransformer, nullable: true })
  customerEmail: string | null;

  @Column({ type: 'varchar', length: 2000, transformer: encryptedTransformer, nullable: true })
  customerName: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ type: 'json', nullable: true })
  payload: Record<string, unknown> | null;
}
