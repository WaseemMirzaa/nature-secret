import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

const ALLOWED_ORIGINS = new Set([
  'https://naturesecret.pk',
  'https://www.naturesecret.pk',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...(process.env.FRONTEND_ORIGIN || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, '').toLowerCase())
    .filter(Boolean),
]);

const ALLOWED_HOSTS = new Set(
  (process.env.FRONTEND_ORIGIN || '')
    .split(',')
    .map((u) => {
      try {
        return new URL(u.trim()).hostname.toLowerCase();
      } catch {
        return '';
      }
    })
    .filter(Boolean),
);

function getAllowedOrigin(origin: string | undefined): string | null {
  if (!origin) return null;
  const o = origin.replace(/\/$/, '').toLowerCase();
  if (ALLOWED_ORIGINS.has(o)) return origin;
  if (o.includes('naturesecret.pk')) return origin;
  try {
    if (ALLOWED_HOSTS.has(new URL(o).hostname.toLowerCase())) return origin;
  } catch {
    /* ignore */
  }
  return null;
}

function setCorsHeaders(res: Response, req: Request): void {
  const origin = getAllowedOrigin(req.headers.origin);
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Content-Disposition, Accept',
  );
}

@Catch()
export class CorsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CorsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    setCorsHeaders(res, req);

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
      );
    }

    res.status(status).json(body);
  }
}
