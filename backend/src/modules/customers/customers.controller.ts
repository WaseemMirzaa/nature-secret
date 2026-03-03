import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('customers')
export class CustomersController {
  constructor(private service: CustomersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: { user: { id: string } }) {
    return this.service.findOne(req.user.id);
  }
}
