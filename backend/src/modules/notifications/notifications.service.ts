import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../database/entities/system-support.entity';
import { User } from '../../database/entities/user.entity';
import { FleetGateway } from '../websocket/fleet.gateway';

import { Driver } from '../../database/entities/driver.entity';

export interface SendNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: string;
  payload?: Record<string, any>;
}

export interface StakeholderEventParams {
  event:
    | 'JOB_CREATED'
    | 'JOB_ASSIGNED'
    | 'JOB_ACCEPTED'
    | 'JOB_REJECTED'
    | 'LOCATION_REACHED'
    | 'MATERIAL_COLLECTED'
    | 'MATERIAL_DELIVERED'
    | 'JOB_FINISHED';
  jobId: string;
  jobNumber: string;
  driverId?: string;
  driverUserId?: string;
  driverName?: string;
  locationName?: string;
  stopSequence?: number;
  stopType?: string;
  orderNumber?: string;
  rejectionReason?: string;
  remarks?: string;
  vehicleInfo?: string;
  createdBy?: string;
  details?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    private readonly wsGateway: FleetGateway,
  ) {}

  async send(params: SendNotificationParams): Promise<Notification> {
    const user = await this.userRepo.findOne({ where: { id: params.userId } });

    const notification = this.notifRepo.create({
      user_id: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      payload: params.payload,
    });

    const saved = await this.notifRepo.save(notification);

    // WebSocket real-time delivery
    this.wsGateway.broadcastAlert({
      type: params.type,
      title: params.title,
      message: params.message,
      payload: params.payload,
    });

    // FCM Push Notification Dispatch
    if (user?.fcm_token) {
      this.logger.log(`Dispatching FCM push to token [${user.fcm_token.substring(0, 10)}...]: ${params.title}`);
    }

    return saved;
  }

  /**
   * Broadcasts lifecycle alerts to:
   * 1. System Admins
   * 2. Godown Managers
   * 3. Respective Driver
   */
  async dispatchStakeholderEvent(params: StakeholderEventParams): Promise<void> {
    // 1. Resolve Driver details if needed
    let driverUserId = params.driverUserId;
    let driverName = params.driverName;

    if (!driverUserId && params.driverId) {
      const driver = await this.driverRepo.findOne({
        where: { id: params.driverId },
        relations: ['user'],
      });
      if (driver?.user) {
        driverUserId = driver.user.id;
        driverName = driver.user.name;
      }
    }

    // 2. Formulate Titles & Messages
    let adminTitle = '';
    let adminMessage = '';
    let driverTitle = '';
    let driverMessage = '';

    const dName = driverName || 'Driver';
    const loc = params.locationName || 'Designated Stop';
    const seq = params.stopSequence !== undefined ? `Stop #${params.stopSequence}` : 'Stop';

    switch (params.event) {
      case 'JOB_CREATED':
        adminTitle = `New Job Created: #${params.jobNumber}`;
        adminMessage = `Delivery job created by ${params.createdBy || 'Staff'}. Awaiting Godown Manager driver allocation.`;
        break;

      case 'JOB_ASSIGNED':
        adminTitle = `Job Assigned: #${params.jobNumber}`;
        adminMessage = `${dName} has been assigned to Job #${params.jobNumber}. Waiting for driver confirmation.`;
        driverTitle = `New Job Offer: #${params.jobNumber}`;
        driverMessage = `New dispatch route assigned to you (Job #${params.jobNumber}). Tap to review parcel and choose vehicle.`;
        break;

      case 'JOB_ACCEPTED':
        adminTitle = `Job Accepted: #${params.jobNumber}`;
        adminMessage = `${dName} accepted Job #${params.jobNumber}${params.vehicleInfo ? ' with ' + params.vehicleInfo : ''}. Preparing to start.`;
        driverTitle = `Job #${params.jobNumber} Confirmed`;
        driverMessage = `You accepted Job #${params.jobNumber}. Tap to start navigation.`;
        break;

      case 'JOB_REJECTED':
        adminTitle = `⚠️ Job Rejected by Driver: #${params.jobNumber}`;
        adminMessage = `${dName} rejected Job #${params.jobNumber}. Reason: ${params.rejectionReason || 'Declined'}${params.remarks ? ' (' + params.remarks + ')' : ''}. Action required: Assign another driver.`;
        driverTitle = `Job #${params.jobNumber} Declined`;
        driverMessage = `You rejected Job #${params.jobNumber}. Notification sent to Godown Manager.`;
        break;

      case 'LOCATION_REACHED':
        adminTitle = `Location Reached: ${loc}`;
        adminMessage = `${dName} arrived at ${loc} (${seq}) for Job #${params.jobNumber}.`;
        driverTitle = `Arrived at ${loc}`;
        driverMessage = `Arrival verified at ${loc}. Ready for cargo operations.`;
        break;

      case 'MATERIAL_COLLECTED':
        adminTitle = `Cargo Picked Up: #${params.jobNumber}`;
        adminMessage = `${dName} completed cargo pickup at ${loc}. Departing for delivery.`;
        driverTitle = `Material Collected Successfully`;
        driverMessage = `Pickup finished at ${loc}. Proceed to next delivery destination.`;
        break;

      case 'MATERIAL_DELIVERED':
        adminTitle = `Cargo Delivered: #${params.jobNumber}`;
        adminMessage = `${dName} completed delivery at ${loc}. Proof of Delivery (POD) recorded.`;
        driverTitle = `Material Delivered (POD Verified)`;
        driverMessage = `Delivery confirmed at ${loc}. Digital signature saved.`;
        break;

      case 'JOB_FINISHED':
        adminTitle = `Job Completed: #${params.jobNumber}`;
        adminMessage = `Job #${params.jobNumber} successfully concluded by ${dName}. All stops verified.`;
        driverTitle = `Trip Finished!`;
        driverMessage = `Job #${params.jobNumber} completed! You are now available for new offers.`;
        break;
    }

    // 3. Find all Admins & Godown Managers
    const managersAndAdmins = await this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('role.name IN (:...roles)', { roles: ['ADMIN', 'GODOWN_MANAGER'] })
      .andWhere('user.status = :status', { status: 'ACTIVE' })
      .getMany();

    // 4. Dispatch to Admins and Godown Managers
    const notificationsToSave: Notification[] = [];

    for (const user of managersAndAdmins) {
      notificationsToSave.push(
        this.notifRepo.create({
          user_id: user.id,
          title: adminTitle,
          message: adminMessage,
          type: params.event,
          payload: {
            ...params.details,
            job_id: params.jobId,
            job_number: params.jobNumber,
            driver_name: dName,
            location_name: loc,
          },
        }),
      );

      if (user.fcm_token) {
        this.logger.log(`[FCM PUSH] To Manager/Admin ${user.name}: ${adminTitle} - ${adminMessage}`);
      }
    }

    // 5. Dispatch to Driver
    if (driverUserId) {
      notificationsToSave.push(
        this.notifRepo.create({
          user_id: driverUserId,
          title: driverTitle,
          message: driverMessage,
          type: params.event,
          payload: {
            ...params.details,
            job_id: params.jobId,
            job_number: params.jobNumber,
            location_name: loc,
          },
        }),
      );

      const driverUser = await this.userRepo.findOne({ where: { id: driverUserId } });
      if (driverUser?.fcm_token) {
        this.logger.log(`[FCM PUSH] To Driver ${dName}: ${driverTitle} - ${driverMessage}`);
      }
    }

    if (notificationsToSave.length > 0) {
      await this.notifRepo.save(notificationsToSave);
    }

    // 6. Broadcast via WebSocket Gateway
    this.wsGateway.broadcastToStakeholders({
      event: params.event,
      title: adminTitle,
      message: adminMessage,
      driverUserId,
      payload: {
        job_id: params.jobId,
        job_number: params.jobNumber,
        driver_name: dName,
        location_name: loc,
        stop_sequence: params.stopSequence,
        driver_title: driverTitle,
        driver_message: driverMessage,
      },
    });

    this.logger.log(
      `[STAKEHOLDER NOTIFICATION DISPATCHED] Event: ${params.event} | Job #${params.jobNumber} | Sent to ${managersAndAdmins.length} Admins/Godown Managers and Driver (${dName})`,
    );
  }

  async getUserNotifications(userId: string, limit = 50, offset = 0) {
    const [notifications, total] = await this.notifRepo.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });

    const unreadCount = await this.notifRepo.count({
      where: { user_id: userId, is_read: false },
    });

    return { data: notifications, total, unread_count: unreadCount };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.notifRepo.findOne({
      where: { id, user_id: userId },
    });
    if (notification) {
      notification.is_read = true;
      notification.read_at = new Date();
      await this.notifRepo.save(notification);
    }
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    await this.notifRepo.update(
      { user_id: userId, is_read: false },
      { is_read: true, read_at: new Date() },
    );
    return { success: true };
  }
}
