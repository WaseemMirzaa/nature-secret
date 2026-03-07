import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as compression from 'compression';
import * as path from 'path';
import * as express from 'express';
import { seedAdminAndCategoriesIfEmpty } from './seed-on-startup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const dataSource = app.get(DataSource);
  try {
    await dataSource.synchronize();
    console.log('Database schema synced');
  } catch (e) {
    console.error('Schema sync failed:', e);
    throw e;
  }
  app.useWebSocketAdapter(new IoAdapter(app));
  app.setGlobalPrefix('api/v1');
  app.use(compression());
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
  app.use('/assets', express.static(publicDir));
  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`API running on port ${port} /api/v1`);

  try {
    await seedAdminAndCategoriesIfEmpty(dataSource);
  } catch (e) {
    console.error('Seed failed:', e?.message || e);
  }
}
bootstrap();
