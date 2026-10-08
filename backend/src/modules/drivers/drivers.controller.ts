import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CreateDriverDto, UpdateDriverDto, UpdateDutyStatusDto } from './dto/driver.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionCode, RoleName } from '../../common/enums';
import { User } from '../../database/entities/user.entity';

@Controller('drivers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  @RequirePermissions(PermissionCode.USER_CREATE)
  async create(
    @Body() dto: CreateDriverDto,
    @CurrentUser() actor: User,
  ) {
    return this.driversService.create(dto, actor.id, actor.role?.name);
  }

  @Get()
  async findAll(
    @Query('duty_status') duty_status?: string,
    @Query('nearby_lat') nearby_lat?: string,
    @Query('nearby_lng') nearby_lng?: string,
    @Query('radius_km') radius_km?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.driversService.findAll({
      duty_status,
      nearby_lat: nearby_lat ? parseFloat(nearby_lat) : undefined,
      nearby_lng: nearby_lng ? parseFloat(nearby_lng) : undefined,
      radius_km: radius_km ? parseFloat(radius_km) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.driversService.findOne(id);
  }

  @Get(':id/location')
  async getDriverLocation(@Param('id') id: string) {
    const driver = await this.driversService.findOne(id);
    return {
      driver_id: driver.id,
      duty_status: driver.duty_status,
      latitude: driver.current_latitude,
      longitude: driver.current_longitude,
      accuracy: driver.current_accuracy,
      speed: driver.current_speed,
      bearing: driver.current_bearing,
      last_gps_at: driver.last_gps_at,
      last_heartbeat_at: driver.last_heartbeat_at,
    };
  }

  @Get(':id/track')
  async getDriverTrack(
    @Param('id') id: string,
    @Query('job_id') jobId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.driversService.getTrackHistory(
      id,
      jobId,
      limit ? parseInt(limit, 10) : 500,
    );
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.USER_UPDATE)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDriverDto,
    @CurrentUser() actor: User,
  ) {
    return this.driversService.update(id, dto, actor.id, actor.role?.name);
  }

  @Patch(':id/duty-status')
  @RequirePermissions(PermissionCode.DRIVER_DUTY_TOGGLE)
  async updateDutyStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDutyStatusDto,
    @CurrentUser() actor: User,
  ) {
    // If actor is driver, ensure they only update their own profile
    if (actor.role?.name === RoleName.DRIVER) {
      if (actor.driver_profile?.id !== id) {
        throw new ForbiddenException('Drivers can only update their own duty status');
      }
    }

    return this.driversService.updateDutyStatus(
      id,
      dto,
      actor.id,
      actor.role?.name,
    );
  }
}
