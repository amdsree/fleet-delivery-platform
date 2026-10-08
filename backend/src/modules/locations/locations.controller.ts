import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionCode } from '../../common/enums';
import { User } from '../../database/entities/user.entity';

@Controller('locations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  async findAll(
    @Query('type') type?: string,
    @Query('active') active?: string,
    @Query('search') search?: string,
    @Query('nearby_lat') nearby_lat?: string,
    @Query('nearby_lng') nearby_lng?: string,
    @Query('radius_km') radius_km?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.locationsService.findAll({
      type,
      active: active !== undefined ? active === 'true' : undefined,
      search,
      nearby_lat: nearby_lat ? parseFloat(nearby_lat) : undefined,
      nearby_lng: nearby_lng ? parseFloat(nearby_lng) : undefined,
      radius_km: radius_km ? parseFloat(radius_km) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.locationsService.findOne(id);
  }

  @Post()
  @RequirePermissions(PermissionCode.LOCATION_CREATE)
  async create(
    @Body() dto: CreateLocationDto,
    @CurrentUser() actor: User,
  ) {
    return this.locationsService.create(dto, actor.id, actor.role?.name);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.LOCATION_UPDATE)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
    @CurrentUser() actor: User,
  ) {
    return this.locationsService.update(id, dto, actor.id, actor.role?.name);
  }

  @Delete(':id')
  @RequirePermissions(PermissionCode.LOCATION_UPDATE)
  async delete(
    @Param('id') id: string,
    @CurrentUser() actor: User,
  ) {
    return this.locationsService.delete(id, actor.id, actor.role?.name);
  }
}
