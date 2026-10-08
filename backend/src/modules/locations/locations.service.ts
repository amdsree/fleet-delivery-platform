import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from '../../database/entities/location.entity';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: {
    type?: string;
    active?: boolean;
    search?: string;
    nearby_lat?: number;
    nearby_lng?: number;
    radius_km?: number;
    limit?: number;
    offset?: number;
  }) {
    const qb = this.locationRepo
      .createQueryBuilder('loc')
      .take(query.limit || 50)
      .skip(query.offset || 0);

    if (query.type) {
      qb.andWhere('loc.type = :type', { type: query.type });
    }
    if (query.active !== undefined) {
      qb.andWhere('loc.active = :active', { active: query.active });
    }
    if (query.search) {
      qb.andWhere(
        '(loc.name ILIKE :search OR loc.address ILIKE :search OR loc.contact_person ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.nearby_lat && query.nearby_lng) {
      const radiusMeters = (query.radius_km || 25) * 1000;
      qb.andWhere(
        `ST_DWithin(
          loc.coordinates,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
          :radius
        )`,
        { lng: query.nearby_lng, lat: query.nearby_lat, radius: radiusMeters },
      );
      qb.addSelect(
        `ST_Distance(
          loc.coordinates,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
        )`,
        'distance_meters',
      );
      qb.orderBy('distance_meters', 'ASC');
    } else {
      qb.orderBy('loc.created_at', 'DESC');
    }

    const [locations, total] = await qb.getManyAndCount();
    return { data: locations, total };
  }

  async findOne(id: string) {
    const location = await this.locationRepo.findOne({ where: { id } });
    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }
    return location;
  }

  async create(dto: CreateLocationDto, actorId: string, actorRole: string) {
    const location = this.locationRepo.create({
      ...dto,
      created_by: actorId,
      coordinates: {
        type: 'Point',
        coordinates: [dto.longitude, dto.latitude],
      } as any,
    });

    const saved = await this.locationRepo.save(location);

    await this.auditService.log({
      userId: actorId,
      userRole: actorRole,
      action: 'LOCATION_CREATED',
      entityName: 'locations',
      entityId: saved.id,
      newValues: { name: saved.name, type: saved.type, lat: saved.latitude, lng: saved.longitude },
    });

    return saved;
  }

  async update(id: string, dto: UpdateLocationDto, actorId: string, actorRole: string) {
    const location = await this.findOne(id);
    const oldValues = { name: location.name, type: location.type, active: location.active };

    Object.assign(location, dto);
    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      location.coordinates = {
        type: 'Point',
        coordinates: [dto.longitude, dto.latitude],
      } as any;
    }

    const saved = await this.locationRepo.save(location);

    await this.auditService.log({
      userId: actorId,
      userRole: actorRole,
      action: 'LOCATION_UPDATED',
      entityName: 'locations',
      entityId: id,
      oldValues,
      newValues: dto,
    });

    return saved;
  }

  async delete(id: string, actorId: string, actorRole: string) {
    const location = await this.findOne(id);
    const locName = location.name;
    try {
      await this.locationRepo.delete(id);
    } catch (err) {
      location.active = false;
      await this.locationRepo.save(location);
    }

    await this.auditService.log({
      userId: actorId,
      userRole: actorRole,
      action: 'LOCATION_DELETED',
      entityName: 'locations',
      entityId: id,
      oldValues: { name: locName, type: location.type },
    });

    return { success: true, message: `Location ${locName} deleted successfully` };
  }
}
