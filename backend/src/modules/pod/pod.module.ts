import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProofOfDelivery } from '../../database/entities/proof-of-delivery.entity';
import { JobStop } from '../../database/entities/job-stop.entity';
import { Job } from '../../database/entities/job.entity';
import { Driver } from '../../database/entities/driver.entity';
import { IdempotencyRecord } from '../../database/entities/system-support.entity';
import { PodService } from './pod.service';
import { PodController } from './pod.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProofOfDelivery,
      JobStop,
      Job,
      Driver,
      IdempotencyRecord,
    ]),
  ],
  controllers: [PodController],
  providers: [PodService],
  exports: [PodService],
})
export class PodModule {}
