import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as compression from 'compression';
import { seedAdminAndCategoriesIfEmpty } from './seed-on-startup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  try {
    const dataSource = app.get(DataSource);
    await dataSource.synchronize();
    console.log('Database schema synced');
  } catch (e) {
    console.error('Schema sync failed:', e);
    throw e;
  }
  try {
    await seedAdminAndCategoriesIfEmpty();
  } catch (e) {
    console.error('Seed failed:', e);
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
    ...(process.env.FRONTEND_ORIGIN || '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean),
  ]);
  app.enableCors({
    origin: (origin, cb) => {
      const o = (origin || '').replace(/\/$/, '');
      if (!o || allowed.has(o)) cb(null, origin || true);
      else cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`API running on port ${port} /api/v1`);
}
bootstrap();
