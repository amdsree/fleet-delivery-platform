import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';

export interface AuditParams {
  userId?: string;
  userRole?: string;
  action: string;
  entityName: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(params: AuditParams): Promise<AuditLog> {
    const entry = this.auditRepo.create({
      user_id: params.userId,
      user_role: params.userRole,
      action: params.action,
      entity_name: params.entityName,
      entity_id: params.entityId,
      old_values: params.oldValues,
      new_values: params.newValues,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
    });
    return this.auditRepo.save(entry);
  }

  async getLogs(query: {
    entity_name?: string;
    entity_id?: string;
    user_id?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }) {
    const qb = this.auditRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .orderBy('log.created_at', 'DESC')
      .take(query.limit || 50)
      .skip(query.offset || 0);

    if (query.entity_name) {
      qb.andWhere('log.entity_name = :entity_name', { entity_name: query.entity_name });
    }
    if (query.entity_id) {
      qb.andWhere('log.entity_id = :entity_id', { entity_id: query.entity_id });
    }
    if (query.user_id) {
      qb.andWhere('log.user_id = :user_id', { user_id: query.user_id });
    }
    if (query.action) {
      qb.andWhere('log.action = :action', { action: query.action });
    }

    const [logs, total] = await qb.getManyAndCount();
    return { data: logs, total };
  }
}
