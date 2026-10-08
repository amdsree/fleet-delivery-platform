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
import { JobStop } from './job-stop.entity';
import { User } from './user.entity';

@Entity('proof_of_deliveries')
export class ProofOfDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Job)
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @Index()
  @Column({ name: 'job_id' })
  job_id: string;

  @OneToOne(() => JobStop, (stop) => stop.pod)
  @JoinColumn({ name: 'stop_id' })
  stop: JobStop;

  @Index({ unique: true })
  @Column({ name: 'stop_id', unique: true })
  stop_id: string;

  @Column({ length: 150 })
  receiver_name: string;

  @Column({ length: 20, nullable: true })
  receiver_phone: string;

  @Column({ type: 'int', default: 0 })
  delivered_quantity: number;

  @Column({ type: 'int', default: 0 })
  damaged_quantity: number;

  @Column({ type: 'int', default: 0 })
  shortage_quantity: number;

  @Column({ type: 'text', nullable: true })
  signature_url: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  photo_urls: string[];

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ type: 'float', nullable: true })
  accuracy: number;

  @Column({ type: 'timestamptz' })
  captured_at: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ name: 'created_by', nullable: true })
  created_by: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 100, nullable: true })
  client_event_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
