import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { AdminUser } from '../../entities/admin-user.entity';
import { Customer } from '../../entities/customer.entity';
import { EmailService } from '../notifications/email.service';
import { FirebaseService } from '../../common/firebase/firebase.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AdminUser) private adminRepo: Repository<AdminUser>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private firebaseService: FirebaseService,
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
    if (!customer || !customer.passwordHash || !(await bcrypt.compare(password, customer.passwordHash))) return null;
    return customer;
  }

  async customerLogin(email: string, password: string) {
    const customer = await this.validateCustomer(email, password);
    if (!customer) throw new UnauthorizedException('Invalid email or password.');
    if (customer.blocked) throw new UnauthorizedException('Account is blocked.');
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

  async customerForgotPassword(email: string, resetBaseUrl: string) {
    const customer = await this.customerRepo.findOne({ where: { email: email.trim().toLowerCase() } });
    if (!customer) return { ok: true };
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await this.customerRepo.update(customer.id, { resetToken: token, resetTokenExpires: expires });
    const link = `${resetBaseUrl.replace(/\/$/, '')}?token=${token}`;
    await this.emailService.sendPasswordReset(customer.email, link);
    return { ok: true };
  }

  async customerResetPassword(token: string, newPassword: string) {
    const customer = await this.customerRepo.findOne({
      where: { resetToken: token },
    });
    if (!customer || !customer.resetTokenExpires || customer.resetTokenExpires < new Date())
      throw new BadRequestException('Invalid or expired reset link.');
    const hash = await bcrypt.hash(newPassword, 10);
    await this.customerRepo.update(customer.id, { passwordHash: hash, resetToken: null, resetTokenExpires: null });
    return { ok: true };
  }

  async firebaseLogin(idToken: string, name?: string) {
    let decoded: { uid: string; email?: string };
    try {
      decoded = await this.firebaseService.verifyIdToken(idToken);
    } catch (e) {
      const msg = (e as Error)?.message ?? '';
      if (msg.includes('Firebase not configured') || msg.includes('credential')) {
        console.error('[Auth] Firebase backend not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in backend .env from Firebase Console → Service accounts → Generate key.');
      } else {
        console.error('[Auth] Firebase token verification failed:', msg);
      }
      throw new UnauthorizedException('Invalid or expired sign-in. Please try again.');
    }
    if (!decoded.uid) throw new UnauthorizedException('Invalid token.');
    let customer = await this.customerRepo.findOne({ where: { firebaseUid: decoded.uid } });
    if (customer) {
      if (customer.blocked) throw new UnauthorizedException('Account is blocked.');
    } else {
      const email = (decoded.email || '').trim().toLowerCase();
      if (!email) throw new UnauthorizedException('Email not provided by sign-in.');
      customer = await this.customerRepo.findOne({ where: { email } });
      if (customer) {
        await this.customerRepo.update(customer.id, { firebaseUid: decoded.uid });
        if (customer.blocked) throw new UnauthorizedException('Account is blocked.');
      } else {
        customer = this.customerRepo.create({
          email,
          firebaseUid: decoded.uid,
          name: name?.trim() || null,
          passwordHash: null,
        });
        await this.customerRepo.save(customer);
      }
    }
    const payload = { sub: customer.id, email: customer.email, type: 'customer' };
    return {
      access_token: this.jwtService.sign(payload),
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
      },
    };
  }
}
