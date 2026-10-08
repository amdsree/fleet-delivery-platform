import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Job } from './job.entity';
import { Driver } from './driver.entity';
import { Vehicle } from './vehicle.entity';

@Entity('trips')
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Job)
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @Index({ unique: true })
  @Column({ name: 'job_id', unique: true })
  job_id: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Index()
  @Column({ name: 'driver_id' })
  driver_id: string;

  @ManyToOne(() => Vehicle)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Index()
  @Column({ name: 'vehicle_id' })
  vehicle_id: string;

  @Column({ type: 'timestamptz' })
  start_time: Date;

  @Column({ type: 'timestamptz', nullable: true })
  end_time: Date;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  start_latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  start_longitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  end_latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  end_longitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  raw_distance_km: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  validated_distance_km: number;

  @Column({ type: 'int', default: 0 })
  driving_duration_mins: number;

  @Column({ type: 'int', default: 0 })
  waiting_duration_mins: number;

  @Column({ type: 'int', default: 0 })
  pickup_duration_mins: number;

  @Column({ type: 'int', default: 0 })
  delivery_duration_mins: number;

  @Column({ type: 'int', default: 0 })
  return_duration_mins: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
