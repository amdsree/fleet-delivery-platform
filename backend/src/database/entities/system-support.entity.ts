import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ name: 'user_id' })
  user_id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Index()
  @Column({ length: 50 })
  type: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any>;

  @Index()
  @Column({ type: 'boolean', default: false })
  is_read: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  read_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

@Entity('idempotency_records')
export class IdempotencyRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 120 })
  client_event_id: string;

  @Column({ length: 50 })
  entity_type: string;

  @Column({ length: 100, nullable: true })
  entity_id: string;

  @Column({ type: 'jsonb', nullable: true })
  response_payload: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

@Entity('system_settings')
export class SystemSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 100 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ length: 50, default: 'STRING' })
  value_type: string;

  @Column({ type: 'text', nullable: true })
  description: string;
}
