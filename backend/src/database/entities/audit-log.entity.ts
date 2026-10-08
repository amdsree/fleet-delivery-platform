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

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ name: 'user_id', nullable: true })
  user_id: string;

  @Column({ length: 50, nullable: true })
  user_role: string;

  @Index()
  @Column({ length: 100 })
  action: string;

  @Index()
  @Column({ length: 100 })
  entity_name: string;

  @Index()
  @Column({ length: 100, nullable: true })
  entity_id: string;

  @Column({ type: 'jsonb', nullable: true })
  old_values: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  new_values: Record<string, any>;

  @Column({ length: 50, nullable: true })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
