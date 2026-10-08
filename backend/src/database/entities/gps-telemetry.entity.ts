import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Driver } from './driver.entity';
import { Job } from './job.entity';
import { Vehicle } from './vehicle.entity';

@Entity('gps_telemetry')
export class GpsTelemetry {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Index()
  @Column({ name: 'driver_id' })
  driver_id: string;

  @ManyToOne(() => Job, { nullable: true })
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @Index()
  @Column({ name: 'job_id', nullable: true })
  job_id: string;

  @ManyToOne(() => Vehicle, { nullable: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Index()
  @Column({ name: 'vehicle_id', nullable: true })
  vehicle_id: string;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ type: 'float', nullable: true })
  accuracy: number;

  @Column({ type: 'float', nullable: true })
  altitude: number;

  @Column({ type: 'float', nullable: true })
  speed: number;

  @Column({ type: 'float', nullable: true })
  bearing: number;

  @Column({ type: 'int', nullable: true })
  battery_level: number;

  @Column({ length: 30, nullable: true })
  network_type: string;

  @Column({ type: 'boolean', default: false })
  is_mock: boolean;

  @Column({ length: 50, nullable: true })
  provider: string;

  @Column({ type: 'bigint', nullable: true })
  sequence_number: number;

  @Index()
  @Column({ type: 'timestamptz' })
  timestamp_device: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  timestamp_server: Date;

  @Index()
  @Column({ type: 'boolean', default: false })
  is_filtered: boolean;
}
