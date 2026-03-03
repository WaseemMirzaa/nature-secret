import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, default: 'staff' })
  role: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  twoFactorSecret: string | null;

  @Column({ type: 'boolean', default: false })
  twoFactorEnabled: boolean;
}
