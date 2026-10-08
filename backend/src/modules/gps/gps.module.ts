import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GpsTelemetry } from '../../database/entities/gps-telemetry.entity';
import { Driver } from '../../database/entities/driver.entity';
import { Job } from '../../database/entities/job.entity';
import { JobStop } from '../../database/entities/job-stop.entity';
import { Trip } from '../../database/entities/trip.entity';
import { GpsService } from './gps.service';
import { GpsController } from './gps.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GpsTelemetry,
      Driver,
      Job,
      JobStop,
      Trip,
    ]),
  ],
  controllers: [GpsController],
  providers: [GpsService],
  exports: [GpsService],
})
export class GpsModule {}
