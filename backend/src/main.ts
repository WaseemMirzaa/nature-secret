import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as compression from 'compression';
import * as path from 'path';
import * as express from 'express';
import { seedAdminAndCategoriesIfEmpty } from './seed-on-startup';
import { CorsExceptionFilter } from './common/filters/cors-exception.filter';

const log = (msg: string) => console.log(`[API] ${new Date().toISOString()} ${msg}`);
const logErr = (msg: string, err?: unknown) =>
  console.error(`[API] ${new Date().toISOString()} ${msg}`, err instanceof Error ? err.message : err ?? '');

async function bootstrap() {
  let app;
  try {
    app = await NestFactory.create(AppModule);
  } catch (e) {
    logErr('Failed to create app (check DB env: MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE)', e);
    throw e;
  }
  // Health check – no DB (try both in case proxy only forwards /api/v1)
  const healthHandler = (_req: express.Request, res: express.Response) => {
    res.status(200).json({ ok: true, ts: Date.now() });
  };
  app.getHttpAdapter().get('/health', healthHandler);
  app.useWebSocketAdapter(new IoAdapter(app));
  app.setGlobalPrefix('api/v1');
  app.getHttpAdapter().get('/api/v1/health', healthHandler);
  app.use('/api/v1', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate');
    const start = Date.now();
    res.on('finish', () => {
      log(`${req.method} ${req.url} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
  });
  app.use(compression());

  const allowed = new Set([
    'https://naturesecret.pk',
    'https://www.naturesecret.pk',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...(process.env.FRONTEND_ORIGIN || '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean),
  ]);
  const allowOrigin = (origin: string | undefined): string | boolean => {
    const o = (origin || '').replace(/\/$/, '').toLowerCase();
    if (!o) return true;
    if (allowed.has(o)) return origin!;
    if (o.includes('naturesecret.pk')) return origin!;
    return false;
  };

  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const origin = req.headers.origin as string | undefined;
    const allowedOrigin = allowOrigin(origin);
    if (typeof allowedOrigin === 'string') res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Disposition, Accept');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        const messages = errors.flatMap((e) => Object.values(e.constraints || {}));
        const single = messages.length ? messages.join('. ') : 'Validation failed';
        return new BadRequestException({ message: single });
      },
    }),
  );
  app.useGlobalFilters(new CorsExceptionFilter());
  app.enableCors({
    origin: (origin, cb) => {
      const result = allowOrigin(origin);
      cb(null, result === false ? false : (result === true ? true : result));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Disposition', 'Accept'],
    optionsSuccessStatus: 204,
    preflightContinue: false,
  });
  const publicDir = path.join(process.cwd(), 'public', 'assets');
  app.use('/assets', express.static(publicDir, {
    setHeaders: (res: express.Response) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate');
    },
  }));
  const port = parseInt(process.env.PORT || '4000', 10);
  await app.listen(port, '0.0.0.0');
  log(`Listening on http://0.0.0.0:${port} – try GET /health or GET /api/v1/health`);

  // DB sync and seed after listen so /health responds immediately
  const dataSource = app.get(DataSource);
  try {
    await dataSource.synchronize();
    log('Database schema synced');
  } catch (e) {
    logErr('Schema sync failed', e);
  }
  try {
    await seedAdminAndCategoriesIfEmpty(dataSource);
    log('Seed check done');
  } catch (e) {
    logErr('Seed failed', e);
  }
}

bootstrap().catch((e) => {
  logErr('Bootstrap failed', e);
  process.exit(1);
});
