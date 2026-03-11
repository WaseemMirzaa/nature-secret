import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT guard: validates token if present and sets req.user; does not throw when missing or invalid.
 * Use for routes that support both authenticated and guest access (e.g. place order).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: unknown, user: TUser | false): TUser | null {
    if (err || user === false) return null;
    return user ?? null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = await super.canActivate(context);
      return result === false ? true : !!result;
    } catch {
      return true;
    }
  }
}
