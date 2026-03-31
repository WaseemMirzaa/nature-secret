import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { MetaConversionsService } from './meta-conversions.service';
import { Public } from '../../common/decorators/public.decorator';
import { TrackEventDto } from './dto/track-event.dto';
import { MetaCapiDto } from './dto/meta-capi.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private service: AnalyticsService,
    private metaCapi: MetaConversionsService,
  ) {}

  @Public()
  @Post('track')
  async track(@Body() dto: TrackEventDto) {
    return this.service.track(dto);
  }

  @Public()
  @Post('meta-capi')
  async metaCapiRelay(@Body() dto: MetaCapiDto, @Req() req: Request) {
    return this.metaCapi.send(dto, req);
  }
}
