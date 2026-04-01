import { IsString, IsOptional, IsObject, MaxLength } from 'class-validator';

export class TrackEventDto {
  @IsString()
  @MaxLength(50)
  type: string;

  @IsString()
  @MaxLength(100)
  sessionId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  productId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  orderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  campaignId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  adsetId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  adId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerName?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
