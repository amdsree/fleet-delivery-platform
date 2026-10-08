import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionCode } from '../../common/enums';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.reportsService.getDashboardSummary();
  }

  @Get('drivers')
  @RequirePermissions(PermissionCode.REPORT_VIEW)
  async getDriverReport(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const data = await this.reportsService.getDriverReport({ from, to });
    if (format === 'csv') {
      const csv = this.reportsService.formatAsCsv(data);
      res.header('Content-Type', 'text/csv');
      res.attachment(`driver_report_${Date.now()}.csv`);
      return res.send(csv);
    }
    return res.json(data);
  }

  @Get('vehicles')
  @RequirePermissions(PermissionCode.REPORT_VIEW)
  async getVehicleReport(@Query('format') format: string, @Res() res: Response) {
    const data = await this.reportsService.getVehicleReport();
    if (format === 'csv') {
      const csv = this.reportsService.formatAsCsv(data);
      res.header('Content-Type', 'text/csv');
      res.attachment(`vehicle_report_${Date.now()}.csv`);
      return res.send(csv);
    }
    return res.json(data);
  }

  @Get('trips')
  @RequirePermissions(PermissionCode.REPORT_VIEW)
  async getTripReport(@Query('limit') limit: string) {
    return this.reportsService.getTripReport(limit ? parseInt(limit, 10) : 100);
  }
}
