import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

export interface JwtPayload {
  sub: string;
  email: string;
  type: 'customer';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'nature-secret-jwt-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type !== 'customer') throw new UnauthorizedException();
    const customer = await this.authService.findCustomerById(payload.sub);
    if (!customer) throw new UnauthorizedException();
    return { id: customer.id, email: customer.email, role: 'customer', type: 'customer' };
  }
}
