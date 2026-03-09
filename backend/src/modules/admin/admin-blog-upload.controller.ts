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
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { createReadStream, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { UPLOAD_PATHS } from '../../common/upload-paths';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt.guard';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';
import { StaffOrAdmin } from '../../common/decorators/admin.decorator';
import { Public } from '../../common/decorators/public.decorator';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function sanitizeSlug(s: string): string {
  return (s || '').replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || '';
}

@Controller('admin/blog')
export class AdminBlogUploadController {
  @Public()
  @Get('upload/:filename')
  serveUpload(@Param('filename') filename: string, @Res() res: Response) {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const filePath = join(UPLOAD_PATHS.blog(), safe);
    if (!existsSync(filePath)) {
      res.status(404).end();
      return;
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    createReadStream(filePath).pipe(res);
  }

  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
  @StaffOrAdmin()
  @Get('images')
  listImages() {
    const base = (process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
    const path = '/api/v1/admin/blog/upload';
    const prefix = base ? `${base}${path}` : path;
    const blogDir = UPLOAD_PATHS.blog();
    if (!existsSync(blogDir)) return { images: [] };
    const files = readdirSync(blogDir).filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f));
    return {
      images: files.map((filename) => ({ url: `${prefix}/${filename}`, filename })),
    };
  }

  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
  @StaffOrAdmin()
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
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
          try {
            const dir = UPLOAD_PATHS.blog();
            mkdirSync(dir, { recursive: true });
            cb(null, dir);
          } catch (e) {
            cb(e instanceof Error ? e : new Error(String(e)), '');
          }
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
    const path = `/api/v1/admin/blog/upload/${file.filename}`;
    return { url: base ? `${base}${path}` : path, alt: body?.alt || '' };
  }
}
