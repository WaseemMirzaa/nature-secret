import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class AdminLoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}

export class AdminRegisterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/, { message: 'Password must contain letters and numbers' })
  password: string;
}

export class CustomerLoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}

export class CustomerRegisterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/, { message: 'Password must contain letters and numbers' })
  password: string;

  @IsString()
  @MaxLength(500)
  @Matches(/^[\p{L}\p{N}\s.\-']*$/u, { message: 'Name contains invalid characters' })
  name?: string;
}

export class ForgotPasswordDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  resetBaseUrl?: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(1, { message: 'Token is required' })
  token: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/, { message: 'Password must contain letters and numbers' })
  newPassword: string;
}
