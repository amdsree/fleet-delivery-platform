import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { CreateUserDto, UpdateUserDto, UpdateUserStatusDto } from './dto/user.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: { role?: string; status?: string; search?: string; limit?: number; offset?: number }) {
    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.driver_profile', 'driver_profile')
      .orderBy('user.created_at', 'DESC')
      .take(query.limit || 20)
      .skip(query.offset || 0);

    if (query.role) {
      qb.andWhere('role.name = :role', { role: query.role });
    }
    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }
    if (query.search) {
      qb.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [users, total] = await qb.getManyAndCount();
    return { data: users, total };
  }

  async findOne(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['role', 'role.permissions', 'driver_profile'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async create(dto: CreateUserDto, actorId: string, actorRole: string) {
    const existing = await this.userRepo.findOne({
      where: [{ email: dto.email }, { phone: dto.phone }],
    });
    if (existing) {
      throw new ConflictException('User with this email or phone already exists');
    }

    const role = await this.roleRepo.findOne({ where: { id: dto.role_id } });
    if (!role) {
      throw new NotFoundException('Specified role not found');
    }

    const password_hash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      ...dto,
      password_hash,
    });

    const saved = await this.userRepo.save(user);

    await this.auditService.log({
      userId: actorId,
      userRole: actorRole,
      action: 'USER_CREATED',
      entityName: 'users',
      entityId: saved.id,
      newValues: { name: saved.name, email: saved.email, role: role.name },
    });

    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateUserDto, actorId: string, actorRole: string) {
    const user = await this.findOne(id);
    const oldValues = { name: user.name, email: user.email, phone: user.phone, status: user.status };

    if (dto.role_id) {
      const role = await this.roleRepo.findOne({ where: { id: dto.role_id } });
      if (!role) {
        throw new NotFoundException('Specified role not found');
      }
    }

    Object.assign(user, dto);
    const updated = await this.userRepo.save(user);

    await this.auditService.log({
      userId: actorId,
      userRole: actorRole,
      action: 'USER_UPDATED',
      entityName: 'users',
      entityId: id,
      oldValues,
      newValues: dto,
    });

    return updated;
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto, actorId: string, actorRole: string) {
    const user = await this.findOne(id);
    const oldStatus = user.status;
    user.status = dto.status;
    if (dto.status !== oldStatus) {
      user.token_version += 1; // Invalidate current session if status changed
    }
    const updated = await this.userRepo.save(user);

    await this.auditService.log({
      userId: actorId,
      userRole: actorRole,
      action: 'USER_STATUS_UPDATED',
      entityName: 'users',
      entityId: id,
      oldValues: { status: oldStatus },
      newValues: { status: dto.status },
    });

    return updated;
  }

  async getRoles() {
    return this.roleRepo.find({ relations: ['permissions'] });
  }
}
