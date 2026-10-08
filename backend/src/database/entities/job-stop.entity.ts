import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Job } from './job.entity';
import { Location } from './location.entity';
import { ProofOfDelivery } from './proof-of-delivery.entity';
import { StopType, StopStatus } from '../../common/enums';

@Entity('job_stops')
export class JobStop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Job, (job) => job.stops, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @Index()
  @Column({ name: 'job_id' })
  job_id: string;

  @Column({ type: 'int' })
  sequence_number: number;

  @ManyToOne(() => Location, { eager: true })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ name: 'location_id' })
  location_id: string;

  @Column({
    type: 'enum',
    enum: StopType,
    default: StopType.DELIVERY,
  })
  stop_type: StopType;

  @Index()
  @Column({
    type: 'enum',
    enum: StopStatus,
    default: StopStatus.PENDING,
  })
  status: StopStatus;

  @Column({ type: 'timestamptz', nullable: true })
  scheduled_time: Date;

  @Column({ type: 'timestamptz', nullable: true })
  gps_auto_arrived_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  driver_confirmed_arrived_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude_at_arrival: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude_at_arrival: number;

  @Column({ type: 'float', nullable: true })
  gps_accuracy_at_arrival: number;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 100, nullable: true })
  client_event_id: string;

  @OneToOne(() => ProofOfDelivery, (pod) => pod.stop)
  pod: ProofOfDelivery;
}
