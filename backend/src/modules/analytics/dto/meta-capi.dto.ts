import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsInt,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/** Meta `custom_data.contents[]`: catalog `id` + `quantity` only (no titles/prices in relay). */
export class MetaCapiContentLineDto {
  @IsString()
  @MaxLength(128)
  id: string;

  @Transform(({ value }) => {
    const x = Number(value);
    if (!Number.isFinite(x)) return 1;
    return Math.max(1, Math.round(x));
  })
  @IsInt()
  @Min(1)
  quantity: number;
}

/**
 * Public CAPI relay — browser sends event after Pixel fires (same event_id for deduplication).
 * Whitelist only: extra JSON keys are rejected by ValidationPipe (`forbidNonWhitelisted`).
 * No product/category title or description in relay; optional `contents` is id+qty lines only.
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

  /** Float monetary amount for Graph `custom_data.value` (not string; 2 d.p.). */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const raw =
      typeof value === 'number' && Number.isFinite(value)
        ? value
        : parseFloat(String(value).trim().replace(/,/g, ''));
    if (!Number.isFinite(raw)) return 0;
    return Math.round(raw * 100) / 100;
  })
  @IsNumber({ maxDecimalPlaces: 2 })
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

  /** Standard commerce: line items for catalog matching (`id` + `quantity` only). */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetaCapiContentLineDto)
  contents?: MetaCapiContentLineDto[];

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

  /** Accepted from client; not forwarded — Meta CAPI `user_data` has no `street` parameter. */
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
  @MaxLength(256)
  fbp?: string;

  /** Meta allows longer `_fbc` (fbclid payload); relay was failing at 100 chars. */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  fbc?: string;

  /** Matches Graph `client_user_agent` cap used in MetaConversionsService (512). */
  @IsOptional()
  @IsString()
  @MaxLength(512)
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

  /**
   * Routes this event to Events Manager → Test events when server has no `META_TEST_EVENT_CODE`
   * (non-production, or production with `META_ALLOW_TEST_EVENT_IN_PRODUCTION=true`). Must match the code in Meta UI.
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  testEventCode?: string;
}
