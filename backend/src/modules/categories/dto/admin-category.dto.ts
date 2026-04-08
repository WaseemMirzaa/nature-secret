import { IsOptional, IsString, MaxLength, Matches, MinLength } from 'class-validator';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @Matches(SLUG_RE, { message: 'slug must be lowercase letters, numbers, and hyphens (e.g. skin-care)' })
  slug: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @Matches(SLUG_RE, { message: 'slug must be lowercase letters, numbers, and hyphens (e.g. skin-care)' })
  slug?: string;
}
