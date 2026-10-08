import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Driver } from './driver.entity';
import { VehicleStatus } from '../../common/enums';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 50 })
  registration_number: string;

  @Column({ length: 50 })
  vehicle_type: string;

  @Column({ length: 50 })
  manufacturer: string;

  @Column({ length: 50 })
  model: string;

  @Column({ type: 'int', nullable: true })
  year: number;

  @Column({ length: 30, default: 'DIESEL' })
  fuel_type: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  payload_capacity_kg: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  volume_capacity_m3: number;

  @Index()
  @Column({
    type: 'enum',
    enum: VehicleStatus,
    default: VehicleStatus.AVAILABLE,
  })
  status: VehicleStatus;

  @ManyToOne(() => Driver, (driver) => driver.assigned_vehicles, { nullable: true })
  @JoinColumn({ name: 'current_driver_id' })
  current_driver: Driver;

  @Column({ name: 'current_driver_id', nullable: true })
  current_driver_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  current_latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  current_longitude: number;

  @Column({ type: 'date', nullable: true })
  insurance_expiry: Date;

  @Column({ type: 'date', nullable: true })
  fitness_expiry: Date;

  @Column({ type: 'date', nullable: true })
  pollution_expiry: Date;

  @Column({ type: 'date', nullable: true })
  permit_expiry: Date;

  @Column({ type: 'int', nullable: true })
  service_due_km: number;

  @Column({ type: 'int', default: 0 })
  current_odometer: number;

  @Column({ type: 'jsonb', nullable: true })
  remarks: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
