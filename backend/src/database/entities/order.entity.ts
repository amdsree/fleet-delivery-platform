import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Location } from './location.entity';
import { OrderItem } from './order-item.entity';
import { OrderVersion } from './order-version.entity';
import { Job } from './job.entity';
import { OrderStatus } from '../../common/enums';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 50 })
  order_number: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ name: 'created_by' })
  created_by: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sales_staff_id' })
  sales_staff: User;

  @Index()
  @Column({ name: 'sales_staff_id' })
  sales_staff_id: string;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'pickup_location_id' })
  pickup_location: Location;

  @Column({ name: 'pickup_location_id' })
  pickup_location_id: string;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'delivery_location_id' })
  delivery_location: Location;

  @Column({ name: 'delivery_location_id' })
  delivery_location_id: string;

  @Column({ type: 'int', default: 2 })
  priority: number;

  @Index()
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.DRAFT,
  })
  order_status: OrderStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_weight_kg: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  total_volume_m3: number;

  @Column({ type: 'int', default: 0 })
  total_quantity: number;

  @Column({ type: 'timestamptz', nullable: true })
  requested_pickup_time: Date;

  @Column({ type: 'timestamptz', nullable: true })
  requested_delivery_time: Date;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ type: 'int', default: 1 })
  current_version: number;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true, eager: true })
  items: OrderItem[];

  @OneToMany(() => OrderVersion, (ver) => ver.order)
  versions: OrderVersion[];

  @OneToMany(() => Job, (job) => job.order)
  jobs: Job[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
