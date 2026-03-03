import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}

export class CustomerLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}

export class CustomerRegisterDto {
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
