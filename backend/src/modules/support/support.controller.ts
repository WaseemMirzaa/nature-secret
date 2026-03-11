import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateSupportTicketDto } from './dto/create-ticket.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('support')
export class SupportController {
  constructor(private service: SupportService) {}

  @Post('tickets')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  async create(@Req() req: { user?: { id: string } }, @Body() dto: CreateSupportTicketDto) {
    return this.service.create(dto, req.user?.id);
  }

  @Get('tickets')
  @UseGuards(JwtAuthGuard)
  async listMy(
    @Req() req: { user: { id: string } },
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.findByCustomerId(req.user.id, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }
}
