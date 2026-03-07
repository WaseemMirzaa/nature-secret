import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminUser } from '../../entities/admin-user.entity';

const DEFAULT_ADMINS = [
  { email: 'admin@naturesecret.com', password: 'Admin123!', role: 'admin' as const },
  { email: 'staff@naturesecret.com', password: 'Staff123!', role: 'staff' as const },
];

@Injectable()
export class SetupService {
  constructor(
    @InjectRepository(AdminUser) private adminRepo: Repository<AdminUser>,
  ) {}

  async seedAdminIfEmpty(): Promise<{ ok: boolean; created: number }> {
    const count = await this.adminRepo.count();
    if (count > 0) return { ok: true, created: 0 };
    let created = 0;
    for (const a of DEFAULT_ADMINS) {
      const existing = await this.adminRepo.findOne({ where: { email: a.email } });
      if (!existing) {
        const hash = await bcrypt.hash(a.password, 10);
        await this.adminRepo.save(
          this.adminRepo.create({ email: a.email, passwordHash: hash, role: a.role }),
        );
        created++;
      }
    }
    return { ok: true, created };
  }
}
