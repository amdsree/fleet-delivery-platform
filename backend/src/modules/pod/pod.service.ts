import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProofOfDelivery } from '../../database/entities/proof-of-delivery.entity';
import { JobStop } from '../../database/entities/job-stop.entity';
import { Job } from '../../database/entities/job.entity';
import { Driver } from '../../database/entities/driver.entity';
import { IdempotencyRecord } from '../../database/entities/system-support.entity';
import { StopStatus, DriverDutyStatus } from '../../common/enums';
import { SubmitPodDto } from './dto/pod.dto';
import { AuditService } from '../audit/audit.service';
import { User } from '../../database/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PodService {
  constructor(
    @InjectRepository(ProofOfDelivery)
    private readonly podRepo: Repository<ProofOfDelivery>,
    @InjectRepository(JobStop)
    private readonly stopRepo: Repository<JobStop>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(IdempotencyRecord)
    private readonly idempotencyRepo: Repository<IdempotencyRecord>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    @Optional()
    private readonly notifService?: NotificationsService,
  ) {}

  async submitPod(dto: SubmitPodDto, actor: User) {
    // 1. Idempotency Check
    if (dto.client_event_id) {
      const existing = await this.idempotencyRepo.findOne({
        where: { client_event_id: dto.client_event_id },
      });
      if (existing) {
        return existing.response_payload;
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const stop = await queryRunner.manager.findOne(JobStop, {
        where: { id: dto.stop_id },
        relations: ['job', 'job.stops'],
      });

      if (!stop) {
        throw new NotFoundException(`Stop ${dto.stop_id} not found`);
      }

      const existingPod = await queryRunner.manager.findOne(ProofOfDelivery, {
        where: { stop_id: dto.stop_id },
      });
      if (existingPod) {
        throw new ConflictException('Proof of delivery has already been submitted for this stop');
      }

      const now = new Date();

      // Create POD
      const pod = queryRunner.manager.create(ProofOfDelivery, {
        job_id: dto.job_id,
        stop_id: dto.stop_id,
        receiver_name: dto.receiver_name,
        receiver_phone: dto.receiver_phone,
        delivered_quantity: dto.delivered_quantity,
        damaged_quantity: dto.damaged_quantity || 0,
        shortage_quantity: dto.shortage_quantity || 0,
        signature_url: dto.signature_url,
        photo_urls: dto.photo_urls || [],
        remarks: dto.remarks,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
        captured_at: now,
        created_by: actor.id,
        client_event_id: dto.client_event_id,
      });

      const savedPod = await queryRunner.manager.save(pod);

      // Complete this stop
      stop.status = StopStatus.COMPLETED;
      stop.completed_at = now;
      await queryRunner.manager.save(stop);

      // Route progression: Advance to next stop if any, or trigger returning
      const sortedStops = [...stop.job.stops].sort((a, b) => a.sequence_number - b.sequence_number);
      const currentIndex = sortedStops.findIndex((s) => s.id === stop.id);
      const nextStop = sortedStops[currentIndex + 1];

      const driver = await queryRunner.manager.findOne(Driver, {
        where: { user_id: actor.id },
      });

      if (nextStop) {
        nextStop.status = StopStatus.EN_ROUTE;
        await queryRunner.manager.save(nextStop);
        if (driver) {
          driver.duty_status = DriverDutyStatus.IN_TRANSIT;
          await queryRunner.manager.save(driver);
        }
      } else {
        if (driver) {
          driver.duty_status = DriverDutyStatus.RETURNING;
          await queryRunner.manager.save(driver);
        }
      }

      await queryRunner.commitTransaction();

      const response = {
        success: true,
        pod: savedPod,
        next_stop: nextStop || null,
      };

      if (dto.client_event_id) {
        await this.idempotencyRepo.save(
          this.idempotencyRepo.create({
            client_event_id: dto.client_event_id,
            entity_type: 'proof_of_deliveries',
            entity_id: savedPod.id,
            response_payload: response,
          }),
        );
      }

      await this.auditService.log({
        userId: actor.id,
        userRole: 'DRIVER',
        action: 'POD_SUBMITTED',
        entityName: 'proof_of_deliveries',
        entityId: savedPod.id,
        newValues: {
          receiver: dto.receiver_name,
          delivered_qty: dto.delivered_quantity,
          damaged_qty: dto.damaged_quantity,
        },
      });

      if (this.notifService) {
        const fullStop = await this.stopRepo.findOne({
          where: { id: stop.id },
          relations: ['location', 'job'],
        });
        await this.notifService.dispatchStakeholderEvent({
          event: 'MATERIAL_DELIVERED',
          jobId: fullStop?.job?.id || dto.job_id,
          jobNumber: fullStop?.job?.job_number || 'JOB',
          driverId: driver?.id,
          driverUserId: actor.id,
          driverName: actor.name,
          locationName: fullStop?.location?.name || 'Customer Location',
          stopSequence: stop.sequence_number,
          stopType: stop.stop_type,
          details: {
            receiver_name: dto.receiver_name,
            delivered_quantity: dto.delivered_quantity,
            damaged_quantity: dto.damaged_quantity,
          },
        });
      }

      return response;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findByJobId(jobId: string) {
    return this.podRepo.find({
      where: { job_id: jobId },
      relations: ['stop', 'stop.location'],
    });
  }
}
