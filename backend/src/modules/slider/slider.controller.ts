import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { SliderService } from './slider.service';
import { CreateSlideDto, UpdateSlideDto } from './dto/slide.dto';
import { UPLOAD_PATHS } from '../../common/upload-paths';
import { Public } from '../../common/decorators/public.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt.guard';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';
import { StaffOrAdmin } from '../../common/decorators/admin.decorator';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function sanitizeSlug(s: string): string {
  return (s || '').replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || '';
}

@Controller('slider')
export class SliderController {
  constructor(private service: SliderService) {}

  @Public()
  @Get()
  async getSlides() {
    return this.service.findAll();
  }

  @Public()
  @Get('upload/:filename')
  serveUpload(@Param('filename') filename: string, @Res() res: Response) {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const path = join(UPLOAD_PATHS.slider(), safe);
    if (!existsSync(path)) {
      res.status(404).end();
      return;
    }
    const stream = createReadStream(path);
    stream.pipe(res);
  }

  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
  @StaffOrAdmin()
  @Get('admin')
  async adminGetSlides() {
    return this.service.findAll();
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
          const dir = UPLOAD_PATHS.slider();
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
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
    const path = `/api/v1/slider/upload/${file.filename}`;
    return { url: base ? `${base}${path}` : path, alt: body?.alt || '' };
  }

  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
  @StaffOrAdmin()
  @Post()
  async create(@Body() dto: CreateSlideDto) {
    return this.service.create(dto);
  }

  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
  @StaffOrAdmin()
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSlideDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
  @StaffOrAdmin()
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const ok = await this.service.remove(id);
    return { deleted: ok };
  }
}
