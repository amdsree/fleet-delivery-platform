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
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto, CancelOrderDto } from './dto/order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionCode, RoleName } from '../../common/enums';
import { User } from '../../database/entities/user.entity';

@Controller('orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async findAll(
    @CurrentUser() actor: User,
    @Query('status') status?: string,
    @Query('sales_staff_id') salesStaffId?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    // If actor is Sales Staff, scope to their own orders by default unless admin/godown
    const filterStaffId =
      actor.role?.name === RoleName.SALES_STAFF ? actor.id : salesStaffId;

    return this.ordersService.findAll({
      status,
      sales_staff_id: filterStaffId,
      priority: priority ? parseInt(priority, 10) : undefined,
      search,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post()
  @RequirePermissions(PermissionCode.ORDER_CREATE)
  async create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() actor: User,
  ) {
    return this.ordersService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.ORDER_UPDATE)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() actor: User,
  ) {
    return this.ordersService.update(id, dto, actor);
  }

  @Post(':id/cancel')
  @RequirePermissions(PermissionCode.ORDER_CANCEL)
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() actor: User,
  ) {
    return this.ordersService.cancel(id, dto, actor);
  }
}
