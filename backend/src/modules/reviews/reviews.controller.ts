import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Head,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { createReadStream, existsSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ReviewsService } from './reviews.service';
import { scheduleReviewVideoOptimize } from './review-video-optimize-in-place';
import { Public } from '../../common/decorators/public.decorator';
import { UPLOAD_PATHS } from '../../common/upload-paths';

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

function contentTypeForReviewsUpload(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    qt: 'video/quicktime',
  };
  return map[ext] || 'application/octet-stream';
}

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
  @Head('upload/:filename')
  headUpload(@Param('filename') filename: string, @Res() res: Response) {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const filePath = join(UPLOAD_PATHS.reviews(), safe);
    if (!existsSync(filePath)) {
      res.status(404).end();
      return;
    }
    const { size } = statSync(filePath);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', String(size));
    res.setHeader('Content-Type', contentTypeForReviewsUpload(safe));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.status(200).end();
  }

  @Public()
  @Get('upload/:filename')
  serveUpload(@Param('filename') filename: string, @Req() req: Request, @Res() res: Response) {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const filePath = join(UPLOAD_PATHS.reviews(), safe);
    if (!existsSync(filePath)) {
      res.status(404).end();
      return;
    }

    const { size: fileSize } = statSync(filePath);
    const contentType = contentTypeForReviewsUpload(safe);

    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Accept-Ranges', 'bytes');

    const range = req.headers.range;
    if (range && /^bytes=/i.test(String(range))) {
      const m = /^bytes=(\d*)-(\d*)$/i.exec(String(range).trim());
      if (!m) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
        return;
      }
      let start = m[1] === '' ? 0 : parseInt(m[1], 10);
      let end = m[2] === '' ? fileSize - 1 : parseInt(m[2], 10);
      if (Number.isNaN(start)) start = 0;
      if (Number.isNaN(end)) end = fileSize - 1;
      if (start >= fileSize) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
        return;
      }
      end = Math.min(end, fileSize - 1);
      if (start > end) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
        return;
      }
      const chunkSize = end - start + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', String(chunkSize));
      res.setHeader('Content-Type', contentType);
      const stream = createReadStream(filePath, { start, end });
      stream.on('error', () => {
        if (!res.headersSent) res.status(500).end();
        else res.end();
      });
      stream.pipe(res);
      return;
    }

    res.setHeader('Content-Length', String(fileSize));
    res.setHeader('Content-Type', contentType);
    const stream = createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).end();
      else res.end();
    });
    stream.pipe(res);
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
          const isVideo = VIDEO_MIMES.includes(file.mimetype);
          const ext = (file.originalname && file.originalname.split('.').pop()) || 'jpg';
          const safeExtRaw = ext.replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'jpg';
          const safeExt = isVideo ? 'mp4' : safeExtRaw;
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
    if (isVideo) {
      scheduleReviewVideoOptimize(file.path, file.mimetype);
    }
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
