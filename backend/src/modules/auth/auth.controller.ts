import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { AdminLoginDto, AdminRegisterDto, CustomerLoginDto, CustomerRegisterDto } from './dto/auth.dto';

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
}
