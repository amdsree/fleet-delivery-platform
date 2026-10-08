import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Vehicle } from './vehicle.entity';
import { DriverDutyStatus } from '../../common/enums';

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.driver_profile)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', unique: true })
  user_id: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 50 })
  license_number: string;

  @Column({ type: 'date' })
  license_expiry: Date;

  @Column({ length: 20, nullable: true })
  emergency_contact: string;

  @Index()
  @Column({
    type: 'enum',
    enum: DriverDutyStatus,
    default: DriverDutyStatus.OFFLINE,
  })
  duty_status: DriverDutyStatus;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  current_location: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  current_latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  current_longitude: number;

  @Column({ type: 'float', nullable: true })
  current_accuracy: number;

  @Column({ type: 'float', nullable: true })
  current_speed: number;

  @Column({ type: 'float', nullable: true })
  current_bearing: number;

  @Column({ type: 'timestamptz', nullable: true })
  last_gps_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_heartbeat_at: Date;

  @Column({ type: 'int', default: 0 })
  consecutive_rejections: number;

  @OneToMany(() => Vehicle, (vehicle) => vehicle.current_driver)
  assigned_vehicles: Vehicle[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
