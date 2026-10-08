import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Job } from '../../database/entities/job.entity';
import { JobStop } from '../../database/entities/job-stop.entity';
import { Order } from '../../database/entities/order.entity';
import { Driver } from '../../database/entities/driver.entity';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { Trip } from '../../database/entities/trip.entity';
import { IdempotencyRecord } from '../../database/entities/system-support.entity';
import {
  JobStatus,
  JobType,
  StopStatus,
  StopType,
  DriverDutyStatus,
  VehicleStatus,
  OrderStatus,
  RoleName,
} from '../../common/enums';
import {
  CreateJobDto,
  AssignJobDto,
  AcceptJobDto,
  RejectJobDto,
  StopArrivalDto,
  StopFailureDto,
} from './dto/job.dto';
import { DispatchEngine } from './dispatch.engine';
import { AuditService } from '../audit/audit.service';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(JobStop)
    private readonly stopRepo: Repository<JobStop>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Trip)
    private readonly tripRepo: Repository<Trip>,
    @InjectRepository(IdempotencyRecord)
    private readonly idempotencyRepo: Repository<IdempotencyRecord>,
    private readonly dataSource: DataSource,
    private readonly dispatchEngine: DispatchEngine,
    private readonly auditService: AuditService,
    @Optional() private readonly notifService?: NotificationsService,
  ) {}

  async findAll(query: {
    status?: string;
    driver_id?: string;
    vehicle_id?: string;
    order_id?: string;
    limit?: number;
    offset?: number;
  }) {
    const qb = this.jobRepo
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.order', 'order')
      .leftJoinAndSelect('job.assigned_driver', 'assigned_driver')
      .leftJoinAndSelect('assigned_driver.user', 'driver_user')
      .leftJoinAndSelect('job.assigned_vehicle', 'assigned_vehicle')
      .leftJoinAndSelect('job.stops', 'stops')
      .leftJoinAndSelect('stops.location', 'location')
      .leftJoinAndSelect('stops.pod', 'pod')
      .orderBy('job.created_at', 'DESC')
      .take(query.limit || 50)
      .skip(query.offset || 0);

    if (query.status) {
      qb.andWhere('job.status = :status', { status: query.status });
    }
    if (query.driver_id) {
      qb.andWhere('job.assigned_driver_id = :driverId', { driverId: query.driver_id });
    }
    if (query.vehicle_id) {
      qb.andWhere('job.assigned_vehicle_id = :vehicleId', { vehicleId: query.vehicle_id });
    }
    if (query.order_id) {
      qb.andWhere('job.order_id = :orderId', { orderId: query.order_id });
    }

    const [jobs, total] = await qb.getManyAndCount();
    return { data: jobs, total };
  }

  async findOne(id: string) {
    const job = await this.jobRepo.findOne({
      where: { id },
      relations: [
        'order',
        'order.items',
        'order.pickup_location',
        'order.delivery_location',
        'assigned_driver',
        'assigned_driver.user',
        'assigned_vehicle',
        'stops',
        'stops.location',
        'stops.pod',
      ],
    });
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    return job;
  }

  async createJob(dto: CreateJobDto, actor: User) {
    const order = await this.orderRepo.findOne({
      where: { id: dto.order_id },
      relations: ['pickup_location', 'delivery_location'],
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${dto.order_id} not found`);
    }

    const jobNumber = `JOB-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const job = queryRunner.manager.create(Job, {
        job_number: jobNumber,
        order_id: dto.order_id,
        job_type: dto.job_type || JobType.DELIVERY,
        status: JobStatus.DRAFT,
        priority: dto.priority || order.priority || 2,
        assigned_driver_id: dto.assigned_driver_id,
        assigned_vehicle_id: dto.assigned_vehicle_id,
        assigned_by: actor.id,
        estimated_distance_km: dto.estimated_distance_km || 0,
        estimated_duration_mins: dto.estimated_duration_mins || 0,
      });

      const savedJob = await queryRunner.manager.save(job);

      const stops = dto.stops.map((s) =>
        queryRunner.manager.create(JobStop, {
          job_id: savedJob.id,
          sequence_number: s.sequence_number,
          location_id: s.location_id,
          stop_type: s.stop_type,
          status: StopStatus.PENDING,
          scheduled_time: s.scheduled_time ? new Date(s.scheduled_time) : null,
          remarks: s.remarks,
        }),
      );
      await queryRunner.manager.save(stops);

      // Transition order status
      order.order_status = OrderStatus.DISPATCH_PENDING;
      await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();

      await this.auditService.log({
        userId: actor.id,
        userRole: actor.role?.name,
        action: 'JOB_CREATED',
        entityName: 'jobs',
        entityId: savedJob.id,
        newValues: { job_number: jobNumber, order_id: order.id, stops_count: stops.length },
      });

      return this.findOne(savedJob.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Automated Dispatch Algorithm Execution
   */
  async autoDispatch(orderId: string, actor: User) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['pickup_location', 'delivery_location'],
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const { candidates, eligibleVehicles } = await this.dispatchEngine.rankCandidates(order);

    if (candidates.length === 0) {
      throw new BadRequestException('No available drivers within operational radius');
    }
    if (eligibleVehicles.length === 0) {
      throw new BadRequestException('No available vehicles meet the payload/volume requirements');
    }

    const topCandidate = candidates[0];
    const topVehicle = eligibleVehicles[0];

    // Find or create Job for this order
    let job = await this.jobRepo.findOne({
      where: { order_id: orderId, status: JobStatus.DRAFT },
      relations: ['stops'],
    });

    if (!job) {
      // Auto-construct Job with Pickup, Delivery, and Return stops
      const createDto: CreateJobDto = {
        order_id: orderId,
        job_type: JobType.DELIVERY,
        priority: order.priority,
        estimated_distance_km: topCandidate.distance_km,
        stops: [
          {
            sequence_number: 1,
            location_id: order.pickup_location_id,
            stop_type: StopType.PICKUP,
            remarks: 'Auto-dispatch pickup stop',
          },
          {
            sequence_number: 2,
            location_id: order.delivery_location_id,
            stop_type: StopType.DELIVERY,
            remarks: 'Auto-dispatch delivery stop',
          },
        ],
      };
      job = await this.createJob(createDto, actor);
    }

    return this.offerJob(job.id, topCandidate.driver.id, topVehicle.id, actor);
  }

  /**
   * Offer Job with TTL & Concurrency Protection
   */
  async offerJob(jobId: string, driverId: string, vehicleId: string, actor: User) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Concurrency protection: Lock driver and vehicle rows
      const driver = await queryRunner.manager
        .createQueryBuilder(Driver, 'driver')
        .setLock('pessimistic_write')
        .where('driver.id = :id', { id: driverId })
        .getOne();

      if (!driver || driver.duty_status !== DriverDutyStatus.AVAILABLE) {
        throw new ConflictException('Selected driver is no longer available');
      }

      const vehicle = await queryRunner.manager
        .createQueryBuilder(Vehicle, 'vehicle')
        .setLock('pessimistic_write')
        .where('vehicle.id = :id', { id: vehicleId })
        .getOne();

      if (!vehicle || vehicle.status !== VehicleStatus.AVAILABLE) {
        throw new ConflictException('Selected vehicle is no longer available');
      }

      const job = await queryRunner.manager
        .createQueryBuilder(Job, 'job')
        .setLock('pessimistic_write')
        .where('job.id = :id', { id: jobId })
        .getOne();

      if (!job) {
        throw new NotFoundException(`Job ${jobId} not found`);
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 60 * 1000); // 60s timeout

      job.status = JobStatus.OFFERED;
      job.assigned_driver_id = driverId;
      job.assigned_vehicle_id = vehicleId;
      job.assigned_by = actor.id;
      job.offered_at = now;
      job.offer_expires_at = expiresAt;
      await queryRunner.manager.save(job);

      driver.duty_status = DriverDutyStatus.JOB_OFFERED;
      await queryRunner.manager.save(driver);

      await queryRunner.commitTransaction();

      await this.auditService.log({
        userId: actor.id,
        userRole: actor.role?.name,
        action: 'JOB_OFFERED',
        entityName: 'jobs',
        entityId: job.id,
        newValues: { driver_id: driverId, vehicle_id: vehicleId, expires_at: expiresAt },
      });

      if (this.notifService) {
        await this.notifService.dispatchStakeholderEvent({
          event: 'JOB_ASSIGNED',
          jobId: job.id,
          jobNumber: job.job_number,
          driverId: driver.id,
          driverUserId: driver.user?.id,
          driverName: driver.user?.name,
          details: { priority: job.priority },
        });
      }

      return this.findOne(job.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Driver Job Acceptance
   */
  async acceptJob(jobId: string, dto: AcceptJobDto, driverUser: User) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const job = await queryRunner.manager
        .createQueryBuilder(Job, 'job')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('job.order', 'order')
        .where('job.id = :id', { id: jobId })
        .getOne();

      if (!job) {
        throw new NotFoundException('Job not found');
      }

      if (job.status !== JobStatus.OFFERED && job.status !== JobStatus.ASSIGNED) {
        throw new BadRequestException(`Cannot accept job with status ${job.status}`);
      }

      const driver = await queryRunner.manager
        .createQueryBuilder(Driver, 'driver')
        .setLock('pessimistic_write')
        .where('driver.user_id = :userId', { userId: driverUser.id })
        .getOne();

      if (!driver || job.assigned_driver_id !== driver.id) {
        throw new ForbiddenException('You are not the designated driver for this job');
      }

      // Verify selected vehicle eligibility
      const vehicle = await queryRunner.manager
        .createQueryBuilder(Vehicle, 'vehicle')
        .setLock('pessimistic_write')
        .where('vehicle.id = :id', { id: dto.vehicle_id })
        .getOne();

      if (!vehicle || vehicle.status !== VehicleStatus.AVAILABLE) {
        throw new BadRequestException('Selected vehicle is not available');
      }

      const requiredWeight = Number(job.order.total_weight_kg) || 0;
      const requiredVol = Number(job.order.total_volume_m3) || 0;

      if (vehicle.payload_capacity_kg < requiredWeight || vehicle.volume_capacity_m3 < requiredVol) {
        throw new BadRequestException(
          `Vehicle capacity (${vehicle.payload_capacity_kg}kg) is insufficient for cargo load (${requiredWeight}kg)`,
        );
      }

      // Transition States
      job.status = JobStatus.ACCEPTED;
      job.accepted_at = new Date();
      job.assigned_vehicle_id = vehicle.id;
      await queryRunner.manager.save(job);

      driver.duty_status = DriverDutyStatus.BUSY;
      driver.consecutive_rejections = 0;
      await queryRunner.manager.save(driver);

      vehicle.status = VehicleStatus.ASSIGNED;
      vehicle.current_driver_id = driver.id;
      await queryRunner.manager.save(vehicle);

      // Update Order Status
      const order = await queryRunner.manager.findOne(Order, { where: { id: job.order_id } });
      if (order) {
        order.order_status = OrderStatus.ASSIGNED;
        await queryRunner.manager.save(order);
      }

      await queryRunner.commitTransaction();

      await this.auditService.log({
        userId: driverUser.id,
        userRole: 'DRIVER',
        action: 'JOB_ACCEPTED',
        entityName: 'jobs',
        entityId: job.id,
        newValues: { vehicle_id: vehicle.id, accepted_at: job.accepted_at },
      });

      return this.findOne(job.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Driver Job Rejection
   */
  async rejectJob(jobId: string, dto: RejectJobDto, driverUser: User) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const job = await queryRunner.manager
        .createQueryBuilder(Job, 'job')
        .setLock('pessimistic_write')
        .where('job.id = :id', { id: jobId })
        .getOne();

      if (!job) {
        throw new NotFoundException('Job not found');
      }

      const driver = await queryRunner.manager
        .createQueryBuilder(Driver, 'driver')
        .setLock('pessimistic_write')
        .where('driver.user_id = :userId', { userId: driverUser.id })
        .getOne();

      if (!driver || job.assigned_driver_id !== driver.id) {
        throw new ForbiddenException('You are not the designated driver for this job');
      }

      job.status = JobStatus.REJECTED;
      job.rejected_at = new Date();
      job.rejection_reason = dto.reason;
      await queryRunner.manager.save(job);

      driver.duty_status = DriverDutyStatus.AVAILABLE;
      driver.consecutive_rejections += 1;
      await queryRunner.manager.save(driver);

      await queryRunner.commitTransaction();

      await this.auditService.log({
        userId: driverUser.id,
        userRole: 'DRIVER',
        action: 'JOB_REJECTED',
        entityName: 'jobs',
        entityId: job.id,
        newValues: { reason: dto.reason, remarks: dto.remarks },
      });

      return { success: true, message: 'Job rejected', job_id: job.id };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Start Job & Initialize Trip
   */
  async startJob(jobId: string, driverUser: User) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const job = await queryRunner.manager.findOne(Job, {
        where: { id: jobId },
        relations: ['stops', 'assigned_driver', 'assigned_vehicle'],
      });

      if (!job) {
        throw new NotFoundException('Job not found');
      }

      if (job.status !== JobStatus.ACCEPTED) {
        throw new BadRequestException(`Cannot start job with status ${job.status}`);
      }

      const driver = await queryRunner.manager.findOne(Driver, {
        where: { user_id: driverUser.id },
      });

      if (!driver || job.assigned_driver_id !== driver.id) {
        throw new ForbiddenException('Not assigned driver');
      }

      const now = new Date();
      job.status = JobStatus.STARTED;
      job.started_at = now;
      await queryRunner.manager.save(job);

      driver.duty_status = DriverDutyStatus.IN_TRANSIT;
      await queryRunner.manager.save(driver);

      if (job.assigned_vehicle) {
        job.assigned_vehicle.status = VehicleStatus.IN_TRIP;
        await queryRunner.manager.save(job.assigned_vehicle);
      }

      // Mark first stop as EN_ROUTE
      if (job.stops && job.stops.length > 0) {
        const sortedStops = [...job.stops].sort((a, b) => a.sequence_number - b.sequence_number);
        sortedStops[0].status = StopStatus.EN_ROUTE;
        await queryRunner.manager.save(sortedStops[0]);
      }

      // Initialize Trip record
      const trip = queryRunner.manager.create(Trip, {
        job_id: job.id,
        driver_id: driver.id,
        vehicle_id: job.assigned_vehicle_id,
        start_time: now,
        start_latitude: driver.current_latitude,
        start_longitude: driver.current_longitude,
      });
      await queryRunner.manager.save(trip);

      // Update Order status
      const order = await queryRunner.manager.findOne(Order, { where: { id: job.order_id } });
      if (order) {
        order.order_status = OrderStatus.IN_PROGRESS;
        await queryRunner.manager.save(order);
      }

      await queryRunner.commitTransaction();

      await this.auditService.log({
        userId: driverUser.id,
        userRole: 'DRIVER',
        action: 'JOB_STARTED',
        entityName: 'jobs',
        entityId: job.id,
        newValues: { started_at: now, trip_id: trip.id },
      });

      return this.findOne(job.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Arrive at Stop (Manual or Geofence Trigger) - Idempotent
   */
  async arriveAtStop(stopId: string, dto: StopArrivalDto, driverUser: User) {
    if (dto.client_event_id) {
      const existing = await this.idempotencyRepo.findOne({
        where: { client_event_id: dto.client_event_id },
      });
      if (existing) {
        return existing.response_payload;
      }
    }

    const stop = await this.stopRepo.findOne({
      where: { id: stopId },
      relations: ['job', 'job.assigned_driver'],
    });

    if (!stop) {
      throw new NotFoundException('Stop not found');
    }

    const now = new Date();
    if (dto.source === 'GEOFENCE') {
      stop.gps_auto_arrived_at = now;
    } else {
      stop.driver_confirmed_arrived_at = now;
    }

    stop.status = StopStatus.ARRIVED;
    stop.latitude_at_arrival = dto.latitude;
    stop.longitude_at_arrival = dto.longitude;
    stop.gps_accuracy_at_arrival = dto.accuracy || null;
    stop.client_event_id = dto.client_event_id || null;

    const savedStop = await this.stopRepo.save(stop);

    // Update driver duty state according to stop type
    const driver = await this.driverRepo.findOne({ where: { user_id: driverUser.id } });
    if (driver) {
      if (stop.stop_type === StopType.PICKUP) {
        driver.duty_status = DriverDutyStatus.AT_PICKUP;
      } else if (stop.stop_type === StopType.DELIVERY) {
        driver.duty_status = DriverDutyStatus.AT_DELIVERY;
      }
      await this.driverRepo.save(driver);
    }

    const response = { success: true, stop: savedStop };

    if (this.notifService) {
      const fullStop = await this.stopRepo.findOne({
        where: { id: stop.id },
        relations: ['location', 'job', 'job.assigned_driver', 'job.assigned_driver.user'],
      });
      await this.notifService.dispatchStakeholderEvent({
        event: 'LOCATION_REACHED',
        jobId: fullStop?.job?.id || stop.job_id,
        jobNumber: fullStop?.job?.job_number || 'JOB',
        driverId: fullStop?.job?.assigned_driver_id || driver?.id,
        driverUserId: driverUser.id,
        driverName: driverUser.name,
        locationName: fullStop?.location?.name || 'Stop',
        stopSequence: stop.sequence_number,
        stopType: stop.stop_type,
      });
    }

    if (dto.client_event_id) {
      await this.idempotencyRepo.save(
        this.idempotencyRepo.create({
          client_event_id: dto.client_event_id,
          entity_type: 'job_stops',
          entity_id: stop.id,
          response_payload: response,
        }),
      );
    }

    return response;
  }

  /**
   * Start Loading / Unloading Operation at Stop
   */
  async startStopOperation(stopId: string, driverUser: User) {
    const stop = await this.stopRepo.findOne({
      where: { id: stopId },
      relations: ['job'],
    });

    if (!stop) {
      throw new NotFoundException('Stop not found');
    }

    stop.status = StopStatus.IN_PROGRESS;
    stop.started_at = new Date();
    await this.stopRepo.save(stop);

    const driver = await this.driverRepo.findOne({ where: { user_id: driverUser.id } });
    if (driver) {
      if (stop.stop_type === StopType.PICKUP) {
        driver.duty_status = DriverDutyStatus.LOADING;
      } else if (stop.stop_type === StopType.DELIVERY) {
        driver.duty_status = DriverDutyStatus.UNLOADING;
      }
      await this.driverRepo.save(driver);
    }

    return stop;
  }

  /**
   * Complete Stop Operation & Advance Route
   */
  async completeStopOperation(stopId: string, driverUser: User) {
    const stop = await this.stopRepo.findOne({
      where: { id: stopId },
      relations: ['job', 'job.stops'],
    });

    if (!stop) {
      throw new NotFoundException('Stop not found');
    }

    stop.status = StopStatus.COMPLETED;
    stop.completed_at = new Date();
    await this.stopRepo.save(stop);

    // Check remaining stops for this job
    const sortedStops = [...stop.job.stops].sort((a, b) => a.sequence_number - b.sequence_number);
    const currentIndex = sortedStops.findIndex((s) => s.id === stop.id);
    const nextStop = sortedStops[currentIndex + 1];

    const driver = await this.driverRepo.findOne({ where: { user_id: driverUser.id } });

    if (nextStop) {
      nextStop.status = StopStatus.EN_ROUTE;
      await this.stopRepo.save(nextStop);
      if (driver) {
        driver.duty_status = DriverDutyStatus.IN_TRANSIT;
        await this.driverRepo.save(driver);
      }
    } else {
      // All stops completed! Driver enters return leg
      if (driver) {
        driver.duty_status = DriverDutyStatus.RETURNING;
        await this.driverRepo.save(driver);
      }
    }

    if (this.notifService) {
      const fullStop = await this.stopRepo.findOne({
        where: { id: stop.id },
        relations: ['location', 'job'],
      });
      const isPickup = stop.stop_type === StopType.PICKUP;
      await this.notifService.dispatchStakeholderEvent({
        event: isPickup ? 'MATERIAL_COLLECTED' : 'MATERIAL_DELIVERED',
        jobId: fullStop?.job?.id || stop.job?.id,
        jobNumber: fullStop?.job?.job_number || 'JOB',
        driverId: driver?.id,
        driverUserId: driverUser.id,
        driverName: driverUser.name,
        locationName: fullStop?.location?.name || 'Stop',
        stopSequence: stop.sequence_number,
        stopType: stop.stop_type,
      });
    }

    return { success: true, completed_stop: stop, next_stop: nextStop || null };
  }

  /**
   * Complete Delivery Job & Finalize Trip Record
   */
  async completeJob(jobId: string, driverUser: User) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const job = await queryRunner.manager.findOne(Job, {
        where: { id: jobId },
        relations: ['assigned_driver', 'assigned_vehicle', 'stops'],
      });

      if (!job) {
        throw new NotFoundException('Job not found');
      }

      const now = new Date();
      job.status = JobStatus.COMPLETED;
      job.completed_at = now;
      if (job.started_at) {
        job.actual_duration_mins = Math.round(
          (now.getTime() - new Date(job.started_at).getTime()) / 60000,
        );
      }
      await queryRunner.manager.save(job);

      if (job.assigned_driver) {
        job.assigned_driver.duty_status = DriverDutyStatus.AVAILABLE;
        await queryRunner.manager.save(job.assigned_driver);
      }

      if (job.assigned_vehicle) {
        job.assigned_vehicle.status = VehicleStatus.AVAILABLE;
        job.assigned_vehicle.current_driver_id = null;
        await queryRunner.manager.save(job.assigned_vehicle);
      }

      // Finalize Trip record
      const trip = await queryRunner.manager.findOne(Trip, { where: { job_id: jobId } });
      if (trip) {
        trip.end_time = now;
        trip.end_latitude = job.assigned_driver?.current_latitude || null;
        trip.end_longitude = job.assigned_driver?.current_longitude || null;
        trip.driving_duration_mins = job.actual_duration_mins;
        await queryRunner.manager.save(trip);
      }

      // Complete Order
      const order = await queryRunner.manager.findOne(Order, { where: { id: job.order_id } });
      if (order) {
        order.order_status = OrderStatus.COMPLETED;
        await queryRunner.manager.save(order);
      }

      await queryRunner.commitTransaction();

      await this.auditService.log({
        userId: driverUser.id,
        userRole: 'DRIVER',
        action: 'JOB_COMPLETED',
        entityName: 'jobs',
        entityId: job.id,
        newValues: { completed_at: now, duration_mins: job.actual_duration_mins },
      });

      if (this.notifService) {
        await this.notifService.dispatchStakeholderEvent({
          event: 'JOB_FINISHED',
          jobId: job.id,
          jobNumber: job.job_number,
          driverId: job.assigned_driver_id,
          driverUserId: driverUser.id,
          driverName: driverUser.name,
          details: {
            actual_duration_mins: job.actual_duration_mins,
          },
        });
      }

      return this.findOne(job.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Mark Delivery Failure
   */
  async failStop(stopId: string, dto: StopFailureDto, driverUser: User) {
    const stop = await this.stopRepo.findOne({
      where: { id: stopId },
      relations: ['job'],
    });

    if (!stop) {
      throw new NotFoundException('Stop not found');
    }

    stop.status = StopStatus.FAILED;
    stop.remarks = `Failure: ${dto.reason}. Remarks: ${dto.remarks || 'None'}`;
    stop.completed_at = new Date();
    await this.stopRepo.save(stop);

    // Update job and order
    const job = await this.jobRepo.findOne({ where: { id: stop.job_id } });
    if (job) {
      job.status = JobStatus.FAILED;
      await this.jobRepo.save(job);
    }

    const order = await this.orderRepo.findOne({ where: { id: job.order_id } });
    if (order) {
      order.order_status = OrderStatus.FAILED;
      await this.orderRepo.save(order);
    }

    const driver = await this.driverRepo.findOne({ where: { user_id: driverUser.id } });
    if (driver) {
      driver.duty_status = DriverDutyStatus.RETURNING;
      await this.driverRepo.save(driver);
    }

    await this.auditService.log({
      userId: driverUser.id,
      userRole: 'DRIVER',
      action: 'DELIVERY_FAILED',
      entityName: 'job_stops',
      entityId: stop.id,
      newValues: { reason: dto.reason, remarks: dto.remarks },
    });

    return { success: true, message: 'Stop marked failed', stop };
  }
}
