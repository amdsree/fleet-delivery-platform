import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PodService } from './pod.service';
import { SubmitPodDto } from './dto/pod.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionCode } from '../../common/enums';
import { User } from '../../database/entities/user.entity';

@Controller('pod')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PodController {
  constructor(private readonly podService: PodService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PermissionCode.POD_UPLOAD)
  async submitPod(
    @Body() dto: SubmitPodDto,
    @CurrentUser() actor: User,
  ) {
    return this.podService.submitPod(dto, actor);
  }

  @Get('job/:job_id')
  async getByJobId(@Param('job_id') jobId: string) {
    return this.podService.findByJobId(jobId);
  }
}
