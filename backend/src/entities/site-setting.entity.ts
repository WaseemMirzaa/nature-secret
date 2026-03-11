import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('site_settings')
export class SiteSetting {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string | null;
}
