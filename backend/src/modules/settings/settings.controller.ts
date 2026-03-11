import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Public()
  @Get('contact')
  getContact() {
    return this.settings.getContact();
  }
}
