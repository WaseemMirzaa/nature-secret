import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

export interface AdminJwtPayload {
  sub: string;
  email: string;
  role: 'admin' | 'staff';
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'nature-secret-jwt-change-in-production',
    });
  }

  async validate(payload: AdminJwtPayload) {
    const admin = await this.authService.findAdminById(payload.sub);
    if (!admin) throw new UnauthorizedException();
    return { id: admin.id, email: admin.email, role: admin.role };
  }
}
