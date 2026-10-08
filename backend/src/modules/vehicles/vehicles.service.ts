import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { VehicleStatus } from '../../common/enums';
import { CreateVehicleDto, UpdateVehicleDto, UpdateVehicleStatusDto } from './dto/vehicle.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: {
    status?: string;
    vehicle_type?: string;
    min_payload_kg?: number;
    min_volume_m3?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const qb = this.vehicleRepo
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.current_driver', 'current_driver')
      .leftJoinAndSelect('current_driver.user', 'driver_user')
      .orderBy('vehicle.created_at', 'DESC')
      .take(query.limit || 50)
      .skip(query.offset || 0);

    if (query.status) {
      qb.andWhere('vehicle.status = :status', { status: query.status });
    }
    if (query.vehicle_type) {
      qb.andWhere('vehicle.vehicle_type = :type', { type: query.vehicle_type });
    }
    if (query.min_payload_kg) {
      qb.andWhere('vehicle.payload_capacity_kg >= :minPayload', {
        minPayload: query.min_payload_kg,
      });
    }
    if (query.min_volume_m3) {
      qb.andWhere('vehicle.volume_capacity_m3 >= :minVolume', {
        minVolume: query.min_volume_m3,
      });
    }
    if (query.search) {
      qb.andWhere(
        '(vehicle.registration_number ILIKE :search OR vehicle.model ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [vehicles, total] = await qb.getManyAndCount();
    return { data: vehicles, total };
  }

  async findEligibleVehicles(requiredWeightKg: number, requiredVolumeM3: number) {
    return this.vehicleRepo
      .createQueryBuilder('vehicle')
      .where('vehicle.status = :status', { status: VehicleStatus.AVAILABLE })
      .andWhere('vehicle.payload_capacity_kg >= :requiredWeight', { requiredWeight: requiredWeightKg })
      .andWhere('vehicle.volume_capacity_m3 >= :requiredVolume', { requiredVolume: requiredVolumeM3 })
      .orderBy('vehicle.payload_capacity_kg', 'ASC') // rank closest optimal capacity first
      .getMany();
  }

  async findOne(id: string) {
    const vehicle = await this.vehicleRepo.findOne({
      where: { id },
      relations: ['current_driver', 'current_driver.user'],
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }
    return vehicle;
  }

  async create(dto: CreateVehicleDto, actorId: string, actorRole: string) {
    const existing = await this.vehicleRepo.findOne({
      where: { registration_number: dto.registration_number },
    });
    if (existing) {
      throw new ConflictException(`Vehicle with registration ${dto.registration_number} already exists`);
    }

    const vehicle = this.vehicleRepo.create({
      ...dto,
      insurance_expiry: dto.insurance_expiry ? new Date(dto.insurance_expiry) : null,
      fitness_expiry: dto.fitness_expiry ? new Date(dto.fitness_expiry) : null,
      pollution_expiry: dto.pollution_expiry ? new Date(dto.pollution_expiry) : null,
      permit_expiry: dto.permit_expiry ? new Date(dto.permit_expiry) : null,
    });

    const saved = await this.vehicleRepo.save(vehicle);

    await this.auditService.log({
      userId: actorId,
      userRole: actorRole,
      action: 'VEHICLE_CREATED',
      entityName: 'vehicles',
      entityId: saved.id,
      newValues: { registration_number: saved.registration_number, payload: saved.payload_capacity_kg },
    });

    return saved;
  }

  async update(id: string, dto: UpdateVehicleDto, actorId: string, actorRole: string) {
    const vehicle = await this.findOne(id);
    const oldValues = {
      status: vehicle.status,
      payload_capacity_kg: vehicle.payload_capacity_kg,
      current_driver_id: vehicle.current_driver_id,
    };

    if (dto.insurance_expiry) vehicle.insurance_expiry = new Date(dto.insurance_expiry);
    if (dto.fitness_expiry) vehicle.fitness_expiry = new Date(dto.fitness_expiry);
    if (dto.pollution_expiry) vehicle.pollution_expiry = new Date(dto.pollution_expiry);
    if (dto.permit_expiry) vehicle.permit_expiry = new Date(dto.permit_expiry);

    Object.assign(vehicle, dto);
    const saved = await this.vehicleRepo.save(vehicle);

    await this.auditService.log({
      userId: actorId,
      userRole: actorRole,
      action: 'VEHICLE_UPDATED',
      entityName: 'vehicles',
      entityId: id,
      oldValues,
      newValues: dto,
    });

    return saved;
  }

  async updateStatus(id: string, dto: UpdateVehicleStatusDto, actorId: string, actorRole: string) {
    const vehicle = await this.findOne(id);
    const oldStatus = vehicle.status;
    vehicle.status = dto.status;

    if (dto.status === VehicleStatus.MAINTENANCE || dto.status === VehicleStatus.INACTIVE) {
      vehicle.current_driver_id = null;
    }

    const saved = await this.vehicleRepo.save(vehicle);

    await this.auditService.log({
      userId: actorId,
      userRole: actorRole,
      action: 'VEHICLE_STATUS_CHANGED',
      entityName: 'vehicles',
      entityId: id,
      oldValues: { status: oldStatus },
      newValues: { status: dto.status, remarks: dto.remarks },
    });

    return saved;
  }

  async delete(id: string, actorId: string, actorRole: string) {
    const vehicle = await this.findOne(id);
    const regNo = vehicle.registration_number;
    try {
      await this.vehicleRepo.delete(id);
    } catch (err) {
      vehicle.status = VehicleStatus.INACTIVE;
      vehicle.current_driver_id = null;
      await this.vehicleRepo.save(vehicle);
    }

    await this.auditService.log({
      userId: actorId,
      userRole: actorRole,
      action: 'VEHICLE_DELETED',
      entityName: 'vehicles',
      entityId: id,
      oldValues: { registration_number: regNo },
    });

    return { success: true, message: `Vehicle ${regNo} deleted successfully` };
  }
}
