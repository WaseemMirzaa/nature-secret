import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsArray,
  IsBoolean,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductVariantDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  volume?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;
}

export class ProductFaqDto {
  @IsString()
  @MaxLength(500)
  q: string;

  @IsString()
  @MaxLength(2000)
  a: string;
}

export class CreateProductDto {
  @IsString()
  @MaxLength(2000)
  name: string;

  @IsString()
  @MaxLength(255)
  slug: string;

  @IsString()
  @MaxLength(36)
  categoryId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  badge?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  badgeSub?: string;

  @IsInt()
  @Min(0)
  price: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  compareAtPrice?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageAlts?: string[];

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reviewCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  inventory?: number;

  @IsOptional()
  @IsBoolean()
  isBestseller?: boolean;

  @IsOptional()
  @IsBoolean()
  outOfStock?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  manufacturingCost?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  boxPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stickerPrice?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductFaqDto)
  faq?: ProductFaqDto[];
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  badge?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  badgeSub?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  compareAtPrice?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageAlts?: string[];

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reviewCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  inventory?: number;

  @IsOptional()
  @IsBoolean()
  isBestseller?: boolean;

  @IsOptional()
  @IsBoolean()
  outOfStock?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  manufacturingCost?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  boxPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stickerPrice?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductFaqDto)
  faq?: ProductFaqDto[];
}
