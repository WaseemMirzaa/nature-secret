import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { diskStorage } from 'multer';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt.guard';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';
import { StaffOrAdmin } from '../../common/decorators/admin.decorator';
import { Public } from '../../common/decorators/public.decorator';

const ASSETS_PRODUCTS = join(process.cwd(), 'assets', 'products');
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function sanitizeSlug(s: string): string {
  return (s || '').replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || '';
}

@Controller('admin/products')
export class AdminProductUploadController {
  @Public()
  @Get('upload/:filename')
  serveUpload(@Param('filename') filename: string, @Res() res: Response) {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const filePath = join(ASSETS_PRODUCTS, safe);
    if (!existsSync(filePath)) {
      res.status(404).end();
      return;
    }
    createReadStream(filePath).pipe(res);
  }

  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
  @StaffOrAdmin()
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
        else cb(new BadRequestException('Invalid image type'), false);
      },
      storage: diskStorage({
        destination: (
          _req: Request,
          _file: Express.Multer.File,
          cb: (error: Error | null, dest: string) => void,
        ) => {
          mkdirSync(ASSETS_PRODUCTS, { recursive: true });
          cb(null, ASSETS_PRODUCTS);
        },
        filename: (
          req: Request,
          file: Express.Multer.File,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const ext = (file.originalname && file.originalname.split('.').pop()) || 'jpg';
          const safeExt = ext.replace(/[^a-z0-9]/gi, '');
          const slug = sanitizeSlug((req as Request & { body?: { slug?: string } }).body?.slug);
          const name = slug ? `${slug}-${randomUUID().slice(0, 8)}` : randomUUID();
          cb(null, `${name}.${safeExt}`);
        },
      }),
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File, @Body() body: { slug?: string; alt?: string }) {
    if (!file) throw new BadRequestException('No image file');
    const base = (process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
    const path = `/api/v1/admin/products/upload/${file.filename}`;
    return { url: base ? `${base}${path}` : path, alt: body?.alt || '' };
  }
}
