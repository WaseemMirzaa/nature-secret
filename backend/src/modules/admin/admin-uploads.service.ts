import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { Product } from '../../entities/product.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { BlogPost } from '../../entities/blog-post.entity';
import { Review } from '../../entities/review.entity';
import { HeroSlide } from '../../entities/hero-slide.entity';
import { UPLOAD_PATHS } from '../../common/upload-paths';

export type UploadZone = 'products' | 'blog' | 'slider' | 'reviews';

const ZONES: UploadZone[] = ['products', 'blog', 'slider', 'reviews'];

function zoneDir(zone: UploadZone): string {
  switch (zone) {
    case 'products':
      return UPLOAD_PATHS.products();
    case 'blog':
      return UPLOAD_PATHS.blog();
    case 'slider':
      return UPLOAD_PATHS.slider();
    case 'reviews':
      return UPLOAD_PATHS.reviews();
    default:
      throw new BadRequestException('Invalid zone');
  }
}

/** URL path fragment stored in DB for this zone + filename (unique per zone). */
export function uploadNeedle(zone: UploadZone, filename: string): string {
  switch (zone) {
    case 'products':
      return `admin/products/upload/${filename}`;
    case 'blog':
      return `admin/blog/upload/${filename}`;
    case 'slider':
      return `slider/upload/${filename}`;
    case 'reviews':
      return `reviews/upload/${filename}`;
    default:
      return filename;
  }
}

function assertSafeFilename(name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, '');
  if (!safe || safe !== name) throw new BadRequestException('Invalid filename');
  return safe;
}

export type UploadRef = {
  kind: 'product' | 'variant' | 'blog_post' | 'review' | 'hero_slide';
  id: string;
  label: string;
  adminHref: string;
};

const BULK_DELETE_MAX_FILES = 100;

export type BulkDeleteSkip = {
  filename: string;
  reason: 'invalid' | 'referenced' | 'not_found' | 'error';
  referenceCount?: number;
  message?: string;
};

@Injectable()
export class AdminUploadsService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(ProductVariant) private variantRepo: Repository<ProductVariant>,
    @InjectRepository(BlogPost) private blogRepo: Repository<BlogPost>,
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(HeroSlide) private slideRepo: Repository<HeroSlide>,
  ) {}

  listZones(): { zones: UploadZone[] } {
    return { zones: ZONES };
  }

  async listZone(zone: UploadZone): Promise<
    Array<{
      filename: string;
      size: number;
      mtimeMs: number;
      referenced: boolean;
      referenceCount: number;
    }>
  > {
    this.assertZone(zone);
    const dir = zoneDir(zone);
    let names: string[];
    try {
      names = await readdir(dir);
    } catch {
      return [];
    }
    const out: Array<{
      filename: string;
      size: number;
      mtimeMs: number;
      referenced: boolean;
      referenceCount: number;
    }> = [];
    for (const name of names) {
      if (!/^[a-zA-Z0-9._-]+$/.test(name)) continue;
      try {
        const st = await stat(join(dir, name));
        if (!st.isFile()) continue;
        const refs = await this.findReferences(zone, name);
        out.push({
          filename: name,
          size: st.size,
          mtimeMs: st.mtimeMs,
          referenced: refs.length > 0,
          referenceCount: refs.length,
        });
      } catch {
        /* skip */
      }
    }
    out.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return out;
  }

  async getRefs(zone: UploadZone, filename: string): Promise<{ filename: string; zone: UploadZone; references: UploadRef[] }> {
    this.assertZone(zone);
    const safe = assertSafeFilename(filename);
    const references = await this.findReferences(zone, safe);
    return { filename: safe, zone, references };
  }

  async deleteFile(zone: UploadZone, filename: string, force: boolean): Promise<{ ok: true; deleted: string }> {
    this.assertZone(zone);
    const safe = assertSafeFilename(filename);
    const refs = await this.findReferences(zone, safe);
    if (refs.length > 0 && !force) {
      throw new ConflictException({ message: 'File is still referenced in the database', references: refs });
    }
    const dir = zoneDir(zone);
    const full = join(dir, safe);
    try {
      await unlink(full);
    } catch (e) {
      const code = (e as NodeJS.ErrnoException)?.code;
      if (code === 'ENOENT') throw new NotFoundException('File not found');
      throw e;
    }
    return { ok: true, deleted: safe };
  }

  /**
   * Delete many files in one zone. Skips invalid names, missing files, and (unless force) DB-referenced files.
   * At most {@link BULK_DELETE_MAX_FILES} names per request.
   */
  async bulkDeleteFiles(
    zone: UploadZone,
    filenames: unknown[],
    force: boolean,
  ): Promise<{ deleted: string[]; skipped: BulkDeleteSkip[]; truncated: number }> {
    this.assertZone(zone);
    const dir = zoneDir(zone);
    const unique = [...new Set((Array.isArray(filenames) ? filenames : []).map((x) => String(x ?? '').trim()))].filter(
      Boolean,
    );
    const truncated = Math.max(0, unique.length - BULK_DELETE_MAX_FILES);
    const capped = unique.slice(0, BULK_DELETE_MAX_FILES);
    const deleted: string[] = [];
    const skipped: BulkDeleteSkip[] = [];

    for (const raw of capped) {
      let safe: string;
      try {
        safe = assertSafeFilename(raw);
      } catch {
        skipped.push({ filename: raw, reason: 'invalid' });
        continue;
      }
      const refs = await this.findReferences(zone, safe);
      if (refs.length > 0 && !force) {
        skipped.push({ filename: safe, reason: 'referenced', referenceCount: refs.length });
        continue;
      }
      const full = join(dir, safe);
      try {
        await unlink(full);
        deleted.push(safe);
      } catch (e) {
        const code = (e as NodeJS.ErrnoException)?.code;
        if (code === 'ENOENT') skipped.push({ filename: safe, reason: 'not_found' });
        else skipped.push({ filename: safe, reason: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    }

    return { deleted, skipped, truncated };
  }

  private assertZone(z: string): asserts z is UploadZone {
    if (!ZONES.includes(z as UploadZone)) throw new BadRequestException(`Invalid zone. Use: ${ZONES.join(', ')}`);
  }

  async findReferences(zone: UploadZone, filename: string): Promise<UploadRef[]> {
    const needle = uploadNeedle(zone, filename);
    const like = `%${needle}%`;
    const refs: UploadRef[] = [];

    const products = await this.productRepo
      .createQueryBuilder('p')
      .select(['p.id', 'p.name', 'p.slug'])
      .where(
        '(p.images IS NOT NULL AND CAST(p.images AS CHAR) LIKE :like) OR ' +
          '(p.imageAlts IS NOT NULL AND CAST(p.imageAlts AS CHAR) LIKE :like) OR ' +
          '(p.description IS NOT NULL AND p.description LIKE :like) OR ' +
          '(p.benefits IS NOT NULL AND CAST(p.benefits AS CHAR) LIKE :like) OR ' +
          '(p.faq IS NOT NULL AND CAST(p.faq AS CHAR) LIKE :like) OR ' +
          '(p.disclaimerText IS NOT NULL AND p.disclaimerText LIKE :like) OR ' +
          '(p.disclaimerItems IS NOT NULL AND CAST(p.disclaimerItems AS CHAR) LIKE :like) OR ' +
          '(p.productBadges IS NOT NULL AND CAST(p.productBadges AS CHAR) LIKE :like)',
        { like },
      )
      .getMany();

    for (const p of products) {
      refs.push({
        kind: 'product',
        id: p.id,
        label: p.name?.slice(0, 120) || p.slug,
        adminHref: `/admin/products/${encodeURIComponent(p.id)}`,
      });
    }

    const variants = await this.variantRepo
      .createQueryBuilder('v')
      .select(['v.id', 'v.name', 'v.productId'])
      .where(
        '(v.image IS NOT NULL AND v.image LIKE :like) OR (v.images IS NOT NULL AND CAST(v.images AS CHAR) LIKE :like)',
        { like },
      )
      .getMany();

    for (const v of variants) {
      refs.push({
        kind: 'variant',
        id: v.id,
        label: `${v.name} (variant)`,
        adminHref: `/admin/products/${encodeURIComponent(v.productId)}`,
      });
    }

    const posts = await this.blogRepo
      .createQueryBuilder('b')
      .select(['b.id', 'b.title', 'b.slug'])
      .where('(b.image IS NOT NULL AND b.image LIKE :like) OR (b.body IS NOT NULL AND b.body LIKE :like)', { like })
      .getMany();

    for (const b of posts) {
      refs.push({
        kind: 'blog_post',
        id: b.id,
        label: b.title?.slice(0, 120) || b.slug,
        adminHref: `/admin/blog/${encodeURIComponent(b.id)}`,
      });
    }

    const reviews = await this.reviewRepo
      .createQueryBuilder('r')
      .select(['r.id', 'r.authorName', 'r.productId'])
      .where('r.media IS NOT NULL AND CAST(r.media AS CHAR) LIKE :like', { like })
      .getMany();

    for (const r of reviews) {
      const pid = r.productId;
      refs.push({
        kind: 'review',
        id: r.id,
        label: r.authorName?.slice(0, 80) || 'Review',
        adminHref: pid ? `/admin/products/${encodeURIComponent(pid)}` : '/admin/products',
      });
    }

    const slides = await this.slideRepo
      .createQueryBuilder('s')
      .select(['s.id', 's.title', 's.imageUrl'])
      .where('s.imageUrl LIKE :like', { like })
      .getMany();

    for (const s of slides) {
      refs.push({
        kind: 'hero_slide',
        id: s.id,
        label: s.title?.slice(0, 80) || 'Home slide',
        adminHref: '/admin/slider',
      });
    }

    const seen = new Set<string>();
    return refs.filter((r) => {
      const k = `${r.kind}:${r.id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
}
