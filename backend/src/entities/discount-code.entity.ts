import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('discount_codes')
export class DiscountCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'int', default: 0 })
  percentOff: number;

  @Column({ type: 'datetime', nullable: true })
  validFrom: Date | null;

  @Column({ type: 'datetime', nullable: true })
  validUntil: Date | null;
}
