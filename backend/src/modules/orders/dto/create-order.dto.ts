import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min, MaxLength } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateOrderItemDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsNumber()
  @Min(1)
  qty: number;

  @IsNumber()
  @Min(0)
  price: number;
}

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  address?: string;

  @IsNumber()
  @Min(0)
  total: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  /** Honeypot: must stay empty (bots/scripts often fill “website”). */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value == null ? '' : String(value)))
  @IsString()
  @MaxLength(0)
  website?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
