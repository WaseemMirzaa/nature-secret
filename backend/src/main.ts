import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
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
    await seedAdminAndCategoriesIfEmpty(dataSource);
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
    }),
  );
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`API running on port ${port} /api/v1`);
}
bootstrap();
