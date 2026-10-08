import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto, UpdateVehicleStatusDto } from './dto/vehicle.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionCode } from '../../common/enums';
import { User } from '../../database/entities/user.entity';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('vehicle_type') vehicle_type?: string,
    @Query('min_payload_kg') min_payload_kg?: string,
    @Query('min_volume_m3') min_volume_m3?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.vehiclesService.findAll({
      status,
      vehicle_type,
      min_payload_kg: min_payload_kg ? parseFloat(min_payload_kg) : undefined,
      min_volume_m3: min_volume_m3 ? parseFloat(min_volume_m3) : undefined,
      search,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('eligible')
  async findEligible(
    @Query('weight_kg') weight_kg: string,
    @Query('volume_m3') volume_m3: string,
  ) {
    return this.vehiclesService.findEligibleVehicles(
      parseFloat(weight_kg || '0'),
      parseFloat(volume_m3 || '0'),
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Post()
  @RequirePermissions(PermissionCode.VEHICLE_CREATE)
  async create(
    @Body() dto: CreateVehicleDto,
    @CurrentUser() actor: User,
  ) {
    return this.vehiclesService.create(dto, actor.id, actor.role?.name);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.VEHICLE_UPDATE)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser() actor: User,
  ) {
    return this.vehiclesService.update(id, dto, actor.id, actor.role?.name);
  }

  @Patch(':id/status')
  @RequirePermissions(PermissionCode.VEHICLE_UPDATE)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleStatusDto,
    @CurrentUser() actor: User,
  ) {
    return this.vehiclesService.updateStatus(id, dto, actor.id, actor.role?.name);
  }
}
