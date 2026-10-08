import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from './order.entity';
import { User } from './user.entity';

@Entity('order_versions')
export class OrderVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id' })
  order_id: string;

  @Index()
  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'jsonb' })
  snapshot: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  change_reason: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'changed_by' })
  modifier: User;

  @Column({ name: 'changed_by', nullable: true })
  changed_by: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
