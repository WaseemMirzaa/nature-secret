import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseBoolPipe,
  DefaultValuePipe,
  ParseEnumPipe,
} from '@nestjs/common';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt.guard';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';
import { AdminOnly } from '../../common/decorators/admin.decorator';
import { AdminUploadsService, UploadZone } from './admin-uploads.service';

enum UploadZoneParam {
  products = 'products',
  blog = 'blog',
  slider = 'slider',
  reviews = 'reviews',
}

@Controller('admin/uploads')
@UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
@AdminOnly()
export class AdminUploadsController {
  constructor(private readonly uploads: AdminUploadsService) {}

  /** List valid zone keys (declare before `:zone` so `zones` is not parsed as a zone). */
  @Get('zones')
  listZones() {
    return this.uploads.listZones();
  }

  @Get(':zone')
  async list(@Param('zone', new ParseEnumPipe(UploadZoneParam)) zoneParam: UploadZoneParam) {
    const zone = zoneParam as UploadZone;
    return { zone, files: await this.uploads.listZone(zone) };
  }

  @Get(':zone/:filename')
  async refs(
    @Param('zone', new ParseEnumPipe(UploadZoneParam)) zoneParam: UploadZoneParam,
    @Param('filename') filename: string,
  ) {
    const zone = zoneParam as UploadZone;
    return this.uploads.getRefs(zone, decodeURIComponent(filename));
  }

  @Delete(':zone/:filename')
  async remove(
    @Param('zone', new ParseEnumPipe(UploadZoneParam)) zoneParam: UploadZoneParam,
    @Param('filename') filename: string,
    @Query('force', new DefaultValuePipe(false), ParseBoolPipe) force: boolean,
  ) {
    const zone = zoneParam as UploadZone;
    return this.uploads.deleteFile(zone, decodeURIComponent(filename), force);
  }
}
