import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { AdminLoginDto, AdminRegisterDto, CustomerLoginDto, CustomerRegisterDto, ForgotPasswordDto, ResetPasswordDto, FirebaseLoginDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('admin/login')
  async adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto.email, dto.password);
  }

  @Public()
  @Post('admin/register')
  async adminRegister(@Body() dto: AdminRegisterDto) {
    return this.authService.adminRegister(dto.email, dto.password);
  }

  @Public()
  @Post('customer/register')
  async customerRegister(@Body() dto: CustomerRegisterDto) {
    return this.authService.customerRegister(dto.email, dto.password, dto.name);
  }

  @Public()
  @Post('customer/login')
  async customerLogin(@Body() dto: CustomerLoginDto) {
    return this.authService.customerLogin(dto.email, dto.password);
  }

  @Public()
  @Post('customer/firebase-login')
  async firebaseLogin(@Body() dto: FirebaseLoginDto) {
    return this.authService.firebaseLogin(dto.idToken, dto.name);
  }

  @Public()
  @Post('customer/forgot-password')
  async customerForgotPassword(@Body() dto: ForgotPasswordDto) {
    const baseUrl = dto.resetBaseUrl || process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
    return this.authService.customerForgotPassword(dto.email, baseUrl);
  }

  @Public()
  @Post('customer/reset-password')
  async customerResetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.customerResetPassword(dto.token, dto.newPassword);
  }
}
