import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSupportTicketDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  subject: string;

  @IsString()
  @MinLength(1)
  message: string;

  @IsOptional()
  @IsString()
  customerId?: string;
}
