import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';

export class CreateSlideDto {
  @IsString()
  @MaxLength(1024)
  imageUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  alt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  href?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateSlideDto {
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  alt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  href?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
