import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { VehicleStatus } from '../../../common/enums';

export class CreateVehicleDto {
  @IsNotEmpty()
  @IsString()
  registration_number: string;

  @IsNotEmpty()
  @IsString()
  vehicle_type: string;

  @IsNotEmpty()
  @IsString()
  manufacturer: string;

  @IsNotEmpty()
  @IsString()
  model: string;

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsString()
  fuel_type?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  payload_capacity_kg: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.1)
  volume_capacity_m3: number;

  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @IsOptional()
  @IsDateString()
  insurance_expiry?: string;

  @IsOptional()
  @IsDateString()
  fitness_expiry?: string;

  @IsOptional()
  @IsDateString()
  pollution_expiry?: string;

  @IsOptional()
  @IsDateString()
  permit_expiry?: string;

  @IsOptional()
  @IsNumber()
  service_due_km?: number;

  @IsOptional()
  @IsNumber()
  current_odometer?: number;
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  vehicle_type?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  payload_capacity_kg?: number;

  @IsOptional()
  @IsNumber()
  volume_capacity_m3?: number;

  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @IsOptional()
  @IsString()
  current_driver_id?: string;

  @IsOptional()
  @IsDateString()
  insurance_expiry?: string;

  @IsOptional()
  @IsDateString()
  fitness_expiry?: string;

  @IsOptional()
  @IsDateString()
  pollution_expiry?: string;

  @IsOptional()
  @IsDateString()
  permit_expiry?: string;

  @IsOptional()
  @IsNumber()
  service_due_km?: number;

  @IsOptional()
  @IsNumber()
  current_odometer?: number;
}

export class UpdateVehicleStatusDto {
  @IsNotEmpty()
  @IsEnum(VehicleStatus)
  status: VehicleStatus;

  @IsOptional()
  @IsString()
  remarks?: string;
}
