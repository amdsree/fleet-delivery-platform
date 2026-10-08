import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from '../../database/entities/job.entity';
import { JobStop } from '../../database/entities/job-stop.entity';
import { Order } from '../../database/entities/order.entity';
import { Driver } from '../../database/entities/driver.entity';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { Trip } from '../../database/entities/trip.entity';
import { IdempotencyRecord } from '../../database/entities/system-support.entity';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { DispatchEngine } from './dispatch.engine';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Job,
      JobStop,
      Order,
      Driver,
      Vehicle,
      Trip,
      IdempotencyRecord,
    ]),
  ],
  controllers: [JobsController],
  providers: [JobsService, DispatchEngine],
  exports: [JobsService, DispatchEngine],
})
export class JobsModule {}
