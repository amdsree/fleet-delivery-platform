import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from '../../database/entities/driver.entity';
import { GpsTelemetry } from '../../database/entities/gps-telemetry.entity';
import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { DriverDutyStatus, RoleName, UserStatus } from '../../common/enums';
import { CreateDriverDto, UpdateDriverDto, UpdateDutyStatusDto, UpdateDriverLocationDto } from './dto/driver.dto';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcryptjs';

const ALLOWED_DRIVER_TRANSITIONS: Record<DriverDutyStatus, DriverDutyStatus[]> = {
  [DriverDutyStatus.OFFLINE]: [DriverDutyStatus.OFF_DUTY, DriverDutyStatus.AVAILABLE],
  [DriverDutyStatus.OFF_DUTY]: [DriverDutyStatus.AVAILABLE, DriverDutyStatus.OFFLINE],
  [DriverDutyStatus.AVAILABLE]: [
    DriverDutyStatus.OFF_DUTY,
    DriverDutyStatus.BREAK,
    DriverDutyStatus.JOB_OFFERED,
    DriverDutyStatus.SUSPENDED,
  ],
  [DriverDutyStatus.BREAK]: [DriverDutyStatus.AVAILABLE, DriverDutyStatus.OFF_DUTY],
  [DriverDutyStatus.JOB_OFFERED]: [DriverDutyStatus.AVAILABLE, DriverDutyStatus.BUSY],
  [DriverDutyStatus.BUSY]: [DriverDutyStatus.AT_PICKUP, DriverDutyStatus.AVAILABLE],
  [DriverDutyStatus.AT_PICKUP]: [DriverDutyStatus.LOADING, DriverDutyStatus.AVAILABLE],
  [DriverDutyStatus.LOADING]: [DriverDutyStatus.IN_TRANSIT],
  [DriverDutyStatus.IN_TRANSIT]: [DriverDutyStatus.AT_DELIVERY, DriverDutyStatus.RETURNING],
  [DriverDutyStatus.AT_DELIVERY]: [DriverDutyStatus.UNLOADING],
  [DriverDutyStatus.UNLOADING]: [DriverDutyStatus.RETURNING, DriverDutyStatus.AVAILABLE],
  [DriverDutyStatus.RETURNING]: [DriverDutyStatus.AVAILABLE],
  [DriverDutyStatus.SUSPENDED]: [DriverDutyStatus.OFF_DUTY],
};

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(GpsTelemetry)
    private readonly telemetryRepo: Repository<GpsTelemetry>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateDriverDto, actorId: string, actorRole?: string) {
    const existingDriver = await this.driverRepo.findOne({
      where: { license_number: dto.license_number },
    });
    if (existingDriver) {
      throw new BadRequestException(`Driver with license number ${dto.license_number} already exists`);
    }

    const existingUser = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });
    if (existingUser) {
      throw new BadRequestException(`User with phone ${dto.phone} already exists`);
    }

    const driverRole = await this.roleRepo.findOne({ where: { name: RoleName.DRIVER } });
    if (!driverRole) {
      throw new NotFoundException('DRIVER role not found in system');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password || 'Driver@123', salt);

    const user = this.userRepo.create({
      name: dto.name,
      phone: dto.phone,
      email: dto.email || `${dto.phone}@fleet.internal`,
      password_hash: passwordHash,
      role_id: driverRole.id,
      status: UserStatus.ACTIVE,
    });
    const savedUser = await this.userRepo.save(user);

    const driver = this.driverRepo.create({
      user_id: savedUser.id,
      license_number: dto.license_number,
      license_expiry: dto.license_expiry ? new Date(dto.license_expiry) : new Date(Date.now() + 365 * 24 * 3600 * 1000),
      emergency_contact: dto.emergency_contact,
      duty_status: DriverDutyStatus.OFF_DUTY,
    });
    const savedDriver = await this.driverRepo.save(driver);

    await this.auditService.log({
      userId: actorId,
      userRole: actorRole,
      action: 'DRIVER_CREATED',
      entityName: 'drivers',
      entityId: savedDriver.id,
      newValues: { name: dto.name, phone: dto.phone, license_number: dto.license_number },
    });

    return this.findOne(savedDriver.id);
  }

  async findAll(query: {
    duty_status?: string;
    nearby_lat?: number;
    nearby_lng?: number;
    radius_km?: number;
    limit?: number;
    offset?: number;
  }) {
    const qb = this.driverRepo
      .createQueryBuilder('driver')
      .leftJoinAndSelect('driver.user', 'user')
      .leftJoinAndSelect('driver.assigned_vehicles', 'assigned_vehicles')
      .take(query.limit || 50)
      .skip(query.offset || 0);

    if (query.duty_status) {
      qb.andWhere('driver.duty_status = :status', { status: query.duty_status });
    }

    if (query.nearby_lat && query.nearby_lng) {
      const radiusMeters = (query.radius_km || 25) * 1000;
      qb.andWhere(
        `ST_DWithin(
          driver.current_location,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
          :radius
        )`,
        { lng: query.nearby_lng, lat: query.nearby_lat, radius: radiusMeters },
      );
      qb.addSelect(
        `ST_Distance(
          driver.current_location,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
        )`,
        'distance_meters',
      );
      qb.orderBy('distance_meters', 'ASC');
    } else {
      qb.orderBy('driver.created_at', 'DESC');
    }

    const [drivers, total] = await qb.getManyAndCount();
    return { data: drivers, total };
  }

  async findOne(id: string) {
    const driver = await this.driverRepo.findOne({
      where: { id },
      relations: ['user', 'assigned_vehicles'],
    });
    if (!driver) {
      throw new NotFoundException(`Driver with ID ${id} not found`);
    }
    return driver;
  }

  async findByUserId(userId: string) {
    const driver = await this.driverRepo.findOne({
      where: { user_id: userId },
      relations: ['user', 'assigned_vehicles'],
    });
    if (!driver) {
      throw new NotFoundException(`Driver profile for user ${userId} not found`);
    }
    return driver;
  }

  async update(id: string, dto: UpdateDriverDto, actorId: string, actorRole: string) {
    const driver = await this.findOne(id);
    const oldValues = { license_number: driver.license_number, emergency_contact: driver.emergency_contact };

    if (dto.license_expiry) {
      driver.license_expiry = new Date(dto.license_expiry);
    }
    if (dto.license_number) driver.license_number = dto.license_number;
    if (dto.emergency_contact) driver.emergency_contact = dto.emergency_contact;

    const saved = await this.driverRepo.save(driver);

    await this.auditService.log({
      userId: actorId,
      userRole: actorRole,
      action: 'DRIVER_UPDATED',
      entityName: 'drivers',
      entityId: id,
      oldValues,
      newValues: dto,
    });

    return saved;
  }

  async updateDutyStatus(
    id: string,
    dto: UpdateDutyStatusDto,
    actorId: string,
    actorRole: string,
    isSystemOverride = false,
  ) {
    const driver = await this.findOne(id);
    const currentStatus = driver.duty_status;
    const targetStatus = dto.duty_status;

    if (currentStatus === targetStatus) {
      return driver;
    }

    // State machine validation
    if (!isSystemOverride && actorRole !== 'ADMIN') {
      const allowed = ALLOWED_DRIVER_TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(targetStatus)) {
        throw new BadRequestException(
          `Invalid state transition: Cannot change driver from ${currentStatus} to ${targetStatus}. Allowed: [${allowed.join(', ')}]`,
        );
      }
    }

    driver.duty_status = targetStatus;
    if (targetStatus === DriverDutyStatus.AVAILABLE) {
      driver.consecutive_rejections = 0; // reset on clean duty cycle
    }

    const saved = await this.driverRepo.save(driver);

    await this.auditService.log({
      userId: actorId,
      userRole: actorRole,
      action: 'DRIVER_DUTY_STATUS_CHANGED',
      entityName: 'drivers',
      entityId: id,
      oldValues: { duty_status: currentStatus },
      newValues: { duty_status: targetStatus, remarks: dto.remarks },
    });

    return saved;
  }

  async updateLocation(id: string, dto: UpdateDriverLocationDto) {
    const driver = await this.findOne(id);
    driver.current_latitude = dto.latitude;
    driver.current_longitude = dto.longitude;
    driver.current_location = {
      type: 'Point',
      coordinates: [dto.longitude, dto.latitude],
    } as any;
    if (dto.accuracy !== undefined) driver.current_accuracy = dto.accuracy;
    if (dto.speed !== undefined) driver.current_speed = dto.speed;
    if (dto.bearing !== undefined) driver.current_bearing = dto.bearing;
    driver.last_gps_at = new Date();
    driver.last_heartbeat_at = new Date();

    return this.driverRepo.save(driver);
  }

  async getTrackHistory(driverId: string, jobId?: string, limit = 500) {
    const qb = this.telemetryRepo
      .createQueryBuilder('telemetry')
      .where('telemetry.driver_id = :driverId', { driverId })
      .andWhere('telemetry.is_filtered = false')
      .orderBy('telemetry.timestamp_device', 'ASC')
      .take(limit);

    if (jobId) {
      qb.andWhere('telemetry.job_id = :jobId', { jobId });
    }

    return qb.getMany();
  }
}
