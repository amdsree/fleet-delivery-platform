import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id' })
  order_id: string;

  @Column({ length: 150 })
  product_name: string;

  @Column({ length: 100, nullable: true })
  sku: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ length: 30, default: 'PCS' })
  unit: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  weight_kg: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  volume_m3: number;

  @Column({ type: 'text', nullable: true })
  remarks: string;
}
