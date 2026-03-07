import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AdminUser } from '../../entities/admin-user.entity';
import { Customer } from '../../entities/customer.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AdminUser) private adminRepo: Repository<AdminUser>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    private jwtService: JwtService,
  ) {}

  async findAdminById(id: string): Promise<AdminUser | null> {
    return this.adminRepo.findOne({ where: { id } });
  }

  async findCustomerById(id: string): Promise<Customer | null> {
    return this.customerRepo.findOne({ where: { id } });
  }

  async validateAdmin(email: string, password: string): Promise<{ id: string; email: string; role: string } | null> {
    const admin = await this.adminRepo.findOne({ where: { email: email.trim().toLowerCase() } });
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) return null;
    return { id: admin.id, email: admin.email, role: admin.role };
  }

  async adminLogin(email: string, password: string) {
    const admin = await this.validateAdmin(email, password);
    if (!admin) throw new UnauthorizedException('Invalid email or password.');
    const payload = { sub: admin.id, email: admin.email, role: admin.role };
    return { access_token: this.jwtService.sign(payload), user: admin };
  }

  async adminRegister(email: string, password: string) {
    const count = await this.adminRepo.count();
    if (count > 0) throw new UnauthorizedException('Signup is disabled. Admin already exists.');
    const existing = await this.adminRepo.findOne({ where: { email: email.trim().toLowerCase() } });
    if (existing) throw new UnauthorizedException('Email already registered.');
    const hash = await bcrypt.hash(password, 10);
    const admin = this.adminRepo.create({
      email: email.trim().toLowerCase(),
      passwordHash: hash,
      role: 'admin',
    });
    await this.adminRepo.save(admin);
    const payload = { sub: admin.id, email: admin.email, role: admin.role };
    return { access_token: this.jwtService.sign(payload), user: { id: admin.id, email: admin.email, role: admin.role } };
  }

  async validateCustomer(email: string, password: string): Promise<Customer | null> {
    const customer = await this.customerRepo.findOne({ where: { email: email.trim().toLowerCase() } });
    if (!customer || !(await bcrypt.compare(password, customer.passwordHash))) return null;
    return customer;
  }

  async customerLogin(email: string, password: string) {
    const customer = await this.validateCustomer(email, password);
    if (!customer) throw new UnauthorizedException('Invalid email or password.');
    const payload = { sub: customer.id, email: customer.email, type: 'customer' };
    return {
      access_token: this.jwtService.sign(payload),
      customer: { id: customer.id, email: customer.email, name: customer.name, phone: customer.phone, address: customer.address },
    };
  }

  async customerRegister(email: string, password: string, name?: string) {
    const existing = await this.customerRepo.findOne({ where: { email: email.trim().toLowerCase() } });
    if (existing) throw new UnauthorizedException('Email already registered.');
    const hash = await bcrypt.hash(password, 10);
    const customer = this.customerRepo.create({
      email: email.trim().toLowerCase(),
      passwordHash: hash,
      name: name || null,
    });
    await this.customerRepo.save(customer);
    const payload = { sub: customer.id, email: customer.email, type: 'customer' };
    return {
      access_token: this.jwtService.sign(payload),
      customer: { id: customer.id, email: customer.email, name: customer.name, phone: customer.phone, address: customer.address },
    };
  }
}
