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
import { User } from './user.entity';
import { LocationType } from '../../common/enums';

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ length: 150 })
  name: string;

  @Index()
  @Column({
    type: 'enum',
    enum: LocationType,
    default: LocationType.CUSTOMER,
  })
  type: LocationType;

  @Column({ type: 'text' })
  address: string;

  @Column({ length: 100, nullable: true })
  contact_person: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  coordinates: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ type: 'int', default: 100 })
  geofence_radius_meters: number;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Index()
  @Column({ type: 'boolean', default: true })
  active: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ name: 'created_by', nullable: true })
  created_by: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
