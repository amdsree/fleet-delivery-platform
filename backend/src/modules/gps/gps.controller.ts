import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GpsService } from './gps.service';
import { BatchGpsDto, HeartbeatDto } from './dto/gps.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionCode } from '../../common/enums';

@Controller('gps')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GpsController {
  constructor(private readonly gpsService: GpsService) {}

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionCode.GPS_INGEST)
  async ingestBatch(@Body() dto: BatchGpsDto) {
    return this.gpsService.ingestBatch(dto);
  }

  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionCode.GPS_INGEST)
  async heartbeat(@Body() dto: HeartbeatDto) {
    return this.gpsService.recordHeartbeat(dto);
  }
}
