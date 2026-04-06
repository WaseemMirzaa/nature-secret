import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { MetaConversionsService } from './meta-conversions.service';
import { Public } from '../../common/decorators/public.decorator';
import { TrackEventDto } from './dto/track-event.dto';
import { MetaCapiDto } from './dto/meta-capi.dto';

@Controller('analytics')
@UseGuards(ThrottlerGuard)
export class AnalyticsController {
  constructor(
    private service: AnalyticsService,
    private metaCapi: MetaConversionsService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 240, ttl: 60000 } })
  @Post('track')
  async track(@Body() dto: TrackEventDto) {
    return this.service.track(dto);
  }

  @Public()
  @Throttle({ default: { limit: 180, ttl: 60000 } })
  @HttpCode(200)
  @Post('meta-capi')
  async metaCapiRelay(@Body() dto: MetaCapiDto, @Req() req: Request) {
    return this.metaCapi.send(dto, req);
  }
}
