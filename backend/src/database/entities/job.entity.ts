import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  VersionColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Driver } from './driver.entity';
import { Vehicle } from './vehicle.entity';
import { User } from './user.entity';
import { JobStop } from './job-stop.entity';
import { JobType, JobStatus, JobRejectReason } from '../../common/enums';

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 50 })
  job_number: string;

  @ManyToOne(() => Order, (order) => order.jobs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Index()
  @Column({ name: 'order_id' })
  order_id: string;

  @Column({
    type: 'enum',
    enum: JobType,
    default: JobType.DELIVERY,
  })
  job_type: JobType;

  @Index()
  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.DRAFT,
  })
  status: JobStatus;

  @Column({ type: 'int', default: 2 })
  priority: number;

  @ManyToOne(() => Driver, { nullable: true, eager: true })
  @JoinColumn({ name: 'assigned_driver_id' })
  assigned_driver: Driver;

  @Index()
  @Column({ name: 'assigned_driver_id', nullable: true })
  assigned_driver_id: string;

  @ManyToOne(() => Vehicle, { nullable: true, eager: true })
  @JoinColumn({ name: 'assigned_vehicle_id' })
  assigned_vehicle: Vehicle;

  @Index()
  @Column({ name: 'assigned_vehicle_id', nullable: true })
  assigned_vehicle_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_by' })
  dispatcher: User;

  @Column({ name: 'assigned_by', nullable: true })
  assigned_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  offered_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  offer_expires_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  accepted_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  rejected_at: Date;

  @Column({
    type: 'enum',
    enum: JobRejectReason,
    nullable: true,
  })
  rejection_reason: JobRejectReason;

  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  cancelled_at: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  estimated_distance_km: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  actual_distance_km: number;

  @Column({ type: 'int', default: 0 })
  estimated_duration_mins: number;

  @Column({ type: 'int', default: 0 })
  actual_duration_mins: number;

  @VersionColumn()
  version: number;

  @OneToMany(() => JobStop, (stop) => stop.job, { cascade: true, eager: true })
  stops: JobStop[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
