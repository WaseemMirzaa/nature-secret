import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Public CAPI relay — browser sends event after Pixel fires (same event_id for deduplication).
 * Whitelist only: extra JSON keys are rejected by ValidationPipe (`forbidNonWhitelisted`).
 * No product/category title, description, or Meta `contents[]` line items — only `content_ids` / `content_category_ids` as string ids.
 */
export class MetaCapiDto {
  @IsString()
  @MaxLength(80)
  eventName: string;

  @IsString()
  @MaxLength(128)
  eventId: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  eventSourceUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  /** Coerce to number so Graph `custom_data.value` is never a string (Custom Conversions reporting). */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const n =
      typeof value === 'number' && Number.isFinite(value)
        ? value
        : Number(String(value).trim().replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  })
  @IsNumber()
  value?: number;

  /** Mirrors Pixel custom_data content_ids (omit or [] when Pixel omits). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contentIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  /** Integer; coerce strings/floats so CAPI `num_items` matches Meta schema. */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const x = Number(value);
    if (!Number.isFinite(x)) return 0;
    return Math.max(0, Math.round(x));
  })
  @IsInt()
  @Min(0)
  numItems?: number;

  /** Override default Meta custom_data.content_type (e.g. home for landing page view). */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contentType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  orderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  /** Purchase-only (hashed server-side). Full name; split into fn/ln for Meta. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  zip?: string;

  /** Two-letter ISO; hashed for CAPI when purchase. */
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fbp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fbc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientUserAgent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(45)
  clientIpAddress?: string;

  /** Meta ads IDs → CAPI `custom_data` as `campaign_id`, `adset_id`, `ad_id` (optional). */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  adsCampaignId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  adsAdsetId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  adsAdId?: string;
}
