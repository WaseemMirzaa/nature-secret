import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

/** Public CAPI relay — browser sends event after Pixel fires (same event_id for deduplication). */
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

  @IsOptional()
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

  @IsOptional()
  @IsInt()
  @Min(0)
  numItems?: number;

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
}
