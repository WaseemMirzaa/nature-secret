import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/** Email/name stored plain for admin analytics queries (access restricted to admin JWT). */
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

  /** Product / catalog content id (matches storefront analytics events). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  contentId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  orderId: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  campaignId: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  adsetId: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  adId: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  customerEmail: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  customerName: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ type: 'json', nullable: true })
  payload: Record<string, unknown> | null;
}
