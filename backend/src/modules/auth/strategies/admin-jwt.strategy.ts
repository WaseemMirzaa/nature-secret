import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: (req: any, rawJwt: any, done: any) => {
        const secret = this.config.get<string>('JWT_SECRET') || process.env.JWT_SECRET || 'nature-secret-jwt-change-in-production';
        done(null, secret);
      },
    });
  }

  async validate(payload: AdminJwtPayload) {
    const admin = await this.authService.findAdminById(payload.sub);
    if (!admin) {
      console.warn(`[AdminJwt] No admin found for sub=${payload.sub}`);
      throw new UnauthorizedException();
    }
    return { id: admin.id, email: admin.email, role: admin.role };
  }
}
