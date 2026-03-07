import { Controller, Post, Headers, UnauthorizedException } from '@nestjs/common';
import { SetupService } from './setup.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('setup')
export class SetupController {
  constructor(private setupService: SetupService) {}

  @Public()
  @Post('seed-admin')
  async seedAdmin(@Headers('x-setup-secret') secret: string) {
    const expected = process.env.SETUP_SECRET;
    if (!expected || secret !== expected) throw new UnauthorizedException('Invalid setup secret');
    return this.setupService.seedAdminIfEmpty();
  }
}
