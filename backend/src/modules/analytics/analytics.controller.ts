import { Body, Controller, Post } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Public } from '../../common/decorators/public.decorator';
import { TrackEventDto } from './dto/track-event.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Public()
  @Post('track')
  async track(@Body() dto: TrackEventDto) {
    return this.service.track(dto);
  }
}
