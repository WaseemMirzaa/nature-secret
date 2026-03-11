import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Order } from './order.entity';
import { CustomerNote } from './customer-note.entity';
import { encryptedTransformer } from '../common/encryption/encryption.util';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  /** Firebase Auth UID; set when customer signs in with Firebase. */
  @Column({ type: 'varchar', length: 128, unique: true, nullable: true })
  firebaseUid: string | null;

  @Column({ type: 'varchar', length: 2000, transformer: encryptedTransformer, nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 2000, transformer: encryptedTransformer, nullable: true })
  phone: string | null;

  @Column({ type: 'text', transformer: encryptedTransformer, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resetToken: string | null;

  @Column({ type: 'datetime', nullable: true })
  resetTokenExpires: Date | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'boolean', default: false })
  blocked: boolean;

  @OneToMany(() => Order, (o) => o.customer)
  orders: Order[];

  @OneToMany(() => CustomerNote, (n) => n.customer)
  notes: CustomerNote[];
}
