import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import {
  CreateJobDto,
  AssignJobDto,
  AcceptJobDto,
  RejectJobDto,
  StopArrivalDto,
  StopFailureDto,
} from './dto/job.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionCode } from '../../common/enums';
import { User } from '../../database/entities/user.entity';

@Controller('jobs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('driver_id') driverId?: string,
    @Query('vehicle_id') vehicleId?: string,
    @Query('order_id') orderId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.jobsService.findAll({
      status,
      driver_id: driverId,
      vehicle_id: vehicleId,
      order_id: orderId,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Post()
  @RequirePermissions(PermissionCode.JOB_DISPATCH)
  async createJob(
    @Body() dto: CreateJobDto,
    @CurrentUser() actor: User,
  ) {
    return this.jobsService.createJob(dto, actor);
  }

  @Post('auto-dispatch/:order_id')
  @RequirePermissions(PermissionCode.JOB_DISPATCH)
  async autoDispatch(
    @Param('order_id') orderId: string,
    @CurrentUser() actor: User,
  ) {
    return this.jobsService.autoDispatch(orderId, actor);
  }

  @Post(':id/assign')
  @RequirePermissions(PermissionCode.JOB_DISPATCH)
  async manualAssign(
    @Param('id') id: string,
    @Body() dto: AssignJobDto,
    @CurrentUser() actor: User,
  ) {
    return this.jobsService.offerJob(id, dto.driver_id, dto.vehicle_id, actor);
  }

  @Post(':id/accept')
  @RequirePermissions(PermissionCode.JOB_ACCEPT_REJECT)
  async acceptJob(
    @Param('id') id: string,
    @Body() dto: AcceptJobDto,
    @CurrentUser() driverUser: User,
  ) {
    return this.jobsService.acceptJob(id, dto, driverUser);
  }

  @Post(':id/reject')
  @RequirePermissions(PermissionCode.JOB_ACCEPT_REJECT)
  async rejectJob(
    @Param('id') id: string,
    @Body() dto: RejectJobDto,
    @CurrentUser() driverUser: User,
  ) {
    return this.jobsService.rejectJob(id, dto, driverUser);
  }

  @Post(':id/start')
  @RequirePermissions(PermissionCode.JOB_EXECUTE)
  async startJob(
    @Param('id') id: string,
    @CurrentUser() driverUser: User,
  ) {
    return this.jobsService.startJob(id, driverUser);
  }

  @Post(':id/complete')
  @RequirePermissions(PermissionCode.JOB_EXECUTE)
  async completeJob(
    @Param('id') id: string,
    @CurrentUser() driverUser: User,
  ) {
    return this.jobsService.completeJob(id, driverUser);
  }

  // Stops endpoints
  @Post('stops/:id/arrive')
  @RequirePermissions(PermissionCode.JOB_EXECUTE)
  async arriveAtStop(
    @Param('id') stopId: string,
    @Body() dto: StopArrivalDto,
    @CurrentUser() driverUser: User,
  ) {
    return this.jobsService.arriveAtStop(stopId, dto, driverUser);
  }

  @Post('stops/:id/start-operation')
  @RequirePermissions(PermissionCode.JOB_EXECUTE)
  async startOperation(
    @Param('id') stopId: string,
    @CurrentUser() driverUser: User,
  ) {
    return this.jobsService.startStopOperation(stopId, driverUser);
  }

  @Post('stops/:id/complete-operation')
  @RequirePermissions(PermissionCode.JOB_EXECUTE)
  async completeOperation(
    @Param('id') stopId: string,
    @CurrentUser() driverUser: User,
  ) {
    return this.jobsService.completeStopOperation(stopId, driverUser);
  }

  @Post('stops/:id/fail')
  @RequirePermissions(PermissionCode.JOB_EXECUTE)
  async failStop(
    @Param('id') stopId: string,
    @Body() dto: StopFailureDto,
    @CurrentUser() driverUser: User,
  ) {
    return this.jobsService.failStop(stopId, dto, driverUser);
  }
}
