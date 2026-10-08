import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UpdateUserStatusDto } from './dto/user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionCode, UserStatus } from '../../common/enums';
import { User } from '../../database/entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(PermissionCode.USER_CREATE)
  async findAll(
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.usersService.findAll({
      role,
      status,
      search,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('roles')
  async getRoles() {
    return this.usersService.getRoles();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermissions(PermissionCode.USER_CREATE)
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: User,
  ) {
    return this.usersService.create(dto, actor.id, actor.role?.name);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.USER_UPDATE)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: User,
  ) {
    return this.usersService.update(id, dto, actor.id, actor.role?.name);
  }

  @Patch(':id/status')
  @RequirePermissions(PermissionCode.USER_DISABLE)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: User,
  ) {
    return this.usersService.updateStatus(id, dto, actor.id, actor.role?.name);
  }

  @Delete(':id')
  @RequirePermissions(PermissionCode.USER_DISABLE)
  async delete(
    @Param('id') id: string,
    @CurrentUser() actor: User,
  ) {
    return this.usersService.delete(id, actor.id, actor.role?.name);
  }
}
