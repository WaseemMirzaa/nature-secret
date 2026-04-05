import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  IsISO8601,
} from 'class-validator';

export class MetaAttributionTargetDto {
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
}

export class MetaAttributionClearDto {
  @IsISO8601()
  from: string;

  @IsISO8601()
  to: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => MetaAttributionTargetDto)
  targets: MetaAttributionTargetDto[];
}
