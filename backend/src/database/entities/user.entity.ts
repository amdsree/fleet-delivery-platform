import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Role } from './role.entity';
import { Driver } from './driver.entity';
import { UserStatus } from '../../common/enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 150 })
  email: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 20 })
  phone: string;

  @Column({ select: false })
  password_hash: string;

  @ManyToOne(() => Role, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ name: 'role_id' })
  role_id: string;

  @Index()
  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ length: 50, nullable: true })
  employee_code: string;

  @Column({ type: 'text', nullable: true })
  profile_photo_url: string;

  @Column({ type: 'text', nullable: true })
  fcm_token: string;

  @Column({ type: 'timestamptz', nullable: true })
  last_login_at: Date;

  @Column({ type: 'int', default: 0 })
  token_version: number;

  @OneToOne(() => Driver, (driver) => driver.user)
  driver_profile: Driver;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
