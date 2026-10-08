import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { OrderVersion } from '../../database/entities/order-version.entity';
import { OrderStatus, RoleName } from '../../common/enums';
import { CreateOrderDto, UpdateOrderDto, CancelOrderDto } from './dto/order.dto';
import { AuditService } from '../audit/audit.service';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(OrderVersion)
    private readonly versionRepo: Repository<OrderVersion>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: {
    status?: string;
    sales_staff_id?: string;
    priority?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.creator', 'creator')
      .leftJoinAndSelect('order.sales_staff', 'sales_staff')
      .leftJoinAndSelect('order.pickup_location', 'pickup_location')
      .leftJoinAndSelect('order.delivery_location', 'delivery_location')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.jobs', 'jobs')
      .orderBy('order.created_at', 'DESC')
      .take(query.limit || 50)
      .skip(query.offset || 0);

    if (query.status) {
      qb.andWhere('order.order_status = :status', { status: query.status });
    }
    if (query.sales_staff_id) {
      qb.andWhere('order.sales_staff_id = :salesStaffId', {
        salesStaffId: query.sales_staff_id,
      });
    }
    if (query.priority) {
      qb.andWhere('order.priority = :priority', { priority: query.priority });
    }
    if (query.search) {
      qb.andWhere('order.order_number ILIKE :search', { search: `%${query.search}%` });
    }

    const [orders, total] = await qb.getManyAndCount();
    return { data: orders, total };
  }

  async findOne(id: string) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: [
        'creator',
        'sales_staff',
        'pickup_location',
        'delivery_location',
        'items',
        'versions',
        'versions.modifier',
        'jobs',
        'jobs.stops',
        'jobs.assigned_driver',
        'jobs.assigned_vehicle',
      ],
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async create(dto: CreateOrderDto, actor: User) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // Calculate aggregated metrics
    let totalQty = 0;
    let totalWeight = 0;
    let totalVolume = 0;

    for (const item of dto.items) {
      totalQty += item.quantity;
      totalWeight += Number(item.weight_kg) * item.quantity;
      totalVolume += Number(item.volume_m3) * item.quantity;
    }

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = queryRunner.manager.create(Order, {
        order_number: orderNumber,
        created_by: actor.id,
        sales_staff_id: actor.id,
        pickup_location_id: dto.pickup_location_id,
        delivery_location_id: dto.delivery_location_id,
        priority: dto.priority || 2,
        order_status: OrderStatus.SUBMITTED,
        total_quantity: totalQty,
        total_weight_kg: Number(totalWeight.toFixed(2)),
        total_volume_m3: Number(totalVolume.toFixed(3)),
        requested_pickup_time: dto.requested_pickup_time ? new Date(dto.requested_pickup_time) : null,
        requested_delivery_time: dto.requested_delivery_time ? new Date(dto.requested_delivery_time) : null,
        remarks: dto.remarks,
        current_version: 1,
      });

      const savedOrder = await queryRunner.manager.save(order);

      const items = dto.items.map((i) =>
        queryRunner.manager.create(OrderItem, {
          order_id: savedOrder.id,
          product_name: i.product_name,
          sku: i.sku,
          quantity: i.quantity,
          unit: i.unit || 'PCS',
          weight_kg: i.weight_kg,
          volume_m3: i.volume_m3,
          remarks: i.remarks,
        }),
      );
      await queryRunner.manager.save(items);

      // Record initial version snapshot
      const version = queryRunner.manager.create(OrderVersion, {
        order_id: savedOrder.id,
        version: 1,
        snapshot: { order: savedOrder, items },
        change_reason: 'Initial order submission',
        changed_by: actor.id,
      });
      await queryRunner.manager.save(version);

      await queryRunner.commitTransaction();

      await this.auditService.log({
        userId: actor.id,
        userRole: actor.role?.name,
        action: 'ORDER_CREATED',
        entityName: 'orders',
        entityId: savedOrder.id,
        newValues: { order_number: orderNumber, items_count: items.length, total_weight: totalWeight },
      });

      return this.findOne(savedOrder.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, dto: UpdateOrderDto, actor: User) {
    const order = await this.findOne(id);

    // Guard: Prevent modification if already in progress or completed
    if (
      order.order_status === OrderStatus.IN_PROGRESS ||
      order.order_status === OrderStatus.COMPLETED ||
      order.order_status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot modify order in status ${order.order_status}. Contact dispatch manager.`,
      );
    }

    if (actor.role?.name === RoleName.SALES_STAFF && order.sales_staff_id !== actor.id) {
      throw new ForbiddenException('Sales staff can only modify their own orders');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const oldSnapshot = {
        pickup_location_id: order.pickup_location_id,
        delivery_location_id: order.delivery_location_id,
        priority: order.priority,
        items: order.items,
        total_quantity: order.total_quantity,
        total_weight_kg: order.total_weight_kg,
      };

      if (dto.items && dto.items.length > 0) {
        await queryRunner.manager.delete(OrderItem, { order_id: id });
        let totalQty = 0;
        let totalWeight = 0;
        let totalVolume = 0;

        for (const item of dto.items) {
          totalQty += item.quantity;
          totalWeight += Number(item.weight_kg) * item.quantity;
          totalVolume += Number(item.volume_m3) * item.quantity;
        }

        const newItems = dto.items.map((i) =>
          queryRunner.manager.create(OrderItem, {
            order_id: id,
            product_name: i.product_name,
            sku: i.sku,
            quantity: i.quantity,
            unit: i.unit || 'PCS',
            weight_kg: i.weight_kg,
            volume_m3: i.volume_m3,
            remarks: i.remarks,
          }),
        );
        await queryRunner.manager.save(newItems);

        order.total_quantity = totalQty;
        order.total_weight_kg = Number(totalWeight.toFixed(2));
        order.total_volume_m3 = Number(totalVolume.toFixed(3));
      }

      if (dto.pickup_location_id) order.pickup_location_id = dto.pickup_location_id;
      if (dto.delivery_location_id) order.delivery_location_id = dto.delivery_location_id;
      if (dto.priority !== undefined) order.priority = dto.priority;
      if (dto.requested_pickup_time) order.requested_pickup_time = new Date(dto.requested_pickup_time);
      if (dto.requested_delivery_time) order.requested_delivery_time = new Date(dto.requested_delivery_time);
      if (dto.remarks) order.remarks = dto.remarks;

      order.current_version += 1;
      const updatedOrder = await queryRunner.manager.save(order);

      // Create immutable version snapshot
      const newVersion = queryRunner.manager.create(OrderVersion, {
        order_id: id,
        version: order.current_version,
        snapshot: { before: oldSnapshot, after: dto },
        change_reason: dto.change_reason,
        changed_by: actor.id,
      });
      await queryRunner.manager.save(newVersion);

      await queryRunner.commitTransaction();

      await this.auditService.log({
        userId: actor.id,
        userRole: actor.role?.name,
        action: 'ORDER_UPDATED',
        entityName: 'orders',
        entityId: id,
        oldValues: oldSnapshot,
        newValues: { version: order.current_version, reason: dto.change_reason },
      });

      return this.findOne(id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async cancel(id: string, dto: CancelOrderDto, actor: User) {
    const order = await this.findOne(id);

    if (
      order.order_status === OrderStatus.IN_PROGRESS ||
      order.order_status === OrderStatus.COMPLETED
    ) {
      throw new BadRequestException(
        `Cannot cancel order with status ${order.order_status}. It is already executing or completed.`,
      );
    }

    if (actor.role?.name === RoleName.SALES_STAFF && order.sales_staff_id !== actor.id) {
      throw new ForbiddenException('Sales staff can only cancel their own orders');
    }

    const oldStatus = order.order_status;
    order.order_status = OrderStatus.CANCELLED;
    order.current_version += 1;
    await this.orderRepo.save(order);

    const version = this.versionRepo.create({
      order_id: id,
      version: order.current_version,
      snapshot: { status: OrderStatus.CANCELLED },
      change_reason: `Order Cancelled: ${dto.reason}`,
      changed_by: actor.id,
    });
    await this.versionRepo.save(version);

    await this.auditService.log({
      userId: actor.id,
      userRole: actor.role?.name,
      action: 'ORDER_CANCELLED',
      entityName: 'orders',
      entityId: id,
      oldValues: { status: oldStatus },
      newValues: { status: OrderStatus.CANCELLED, reason: dto.reason },
    });

    return order;
  }
}
