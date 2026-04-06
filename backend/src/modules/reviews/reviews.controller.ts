import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ReviewsService } from './reviews.service';
import { Public } from '../../common/decorators/public.decorator';
import { UPLOAD_PATHS } from '../../common/upload-paths';

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

@Controller('reviews')
export class ReviewsController {
  constructor(private service: ReviewsService) {}

  @Public()
  @Get()
  async list(@Query('productId') productId: string) {
    if (!productId) return [];
    return this.service.findByProductId(productId);
  }

  @Public()
  @Get('highlights')
  async highlights() {
    return this.service.findHighlights(12);
  }

  @Public()
  @Get('upload/:filename')
  serveUpload(@Param('filename') filename: string, @Res() res: Response) {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const filePath = join(UPLOAD_PATHS.reviews(), safe);
    if (!existsSync(filePath)) {
      res.status(404).end();
      return;
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    createReadStream(filePath).pipe(res);
  }

  @Public()
  @Post('upload')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_VIDEO_BYTES },
      fileFilter: (_req, file, cb) => {
        const ok = [...IMAGE_MIMES, ...VIDEO_MIMES].includes(file.mimetype);
        if (!ok) cb(new BadRequestException('Invalid file type'), false);
        else cb(null, true);
      },
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          try {
            const dir = UPLOAD_PATHS.reviews();
            mkdirSync(dir, { recursive: true });
            cb(null, dir);
          } catch (e) {
            cb(e instanceof Error ? e : new Error(String(e)), '');
          }
        },
        filename: (_req, file, cb) => {
          const ext = (file.originalname && file.originalname.split('.').pop()) || 'jpg';
          const safeExt = ext.replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'jpg';
          cb(null, `r-${randomUUID().slice(0, 12)}.${safeExt}`);
        },
      }),
    }),
  )
  uploadReviewFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file');
    const isVideo = VIDEO_MIMES.includes(file.mimetype);
    const isImage = IMAGE_MIMES.includes(file.mimetype);
    if (isImage && file.size > MAX_IMAGE_BYTES) throw new BadRequestException('Image too large (max 5MB)');
    if (isVideo && file.size > MAX_VIDEO_BYTES) throw new BadRequestException('Video too large (max 25MB)');
    const base = (process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
    const path = `/api/v1/reviews/upload/${file.filename}`;
    const type: 'image' | 'video' = isVideo ? 'video' : 'image';
    return { url: base ? `${base}${path}` : path, type };
  }

  @Public()
  @Post()
  async create(
    @Body()
    body: {
      productId: string;
      authorName?: string;
      rating?: number;
      body: string;
      media?: Array<{ type?: string; url: string }>;
    },
  ) {
    if (!body?.productId || !body?.body) return { ok: false };
    const review = await this.service.createUserReview({
      productId: body.productId,
      authorName: body.authorName || 'Customer',
      rating: body.rating ?? 5,
      body: body.body,
      media: body.media,
    });
    return { ok: true, id: review.id };
  }
}
