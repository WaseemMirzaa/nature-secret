import { IsString, IsOptional, IsArray, IsInt, Min, MaxLength } from 'class-validator';

export class CreateBlogPostDto {
  @IsString()
  @MaxLength(500)
  title: string;

  @IsString()
  @MaxLength(500)
  slug: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  template?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageAlt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  readTimeMinutes?: number;

  @IsOptional()
  @IsString()
  publishedAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedProductIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string;
}

export class UpdateBlogPostDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  slug?: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  template?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageAlt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  readTimeMinutes?: number;

  @IsOptional()
  @IsString()
  publishedAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedProductIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string;
}
