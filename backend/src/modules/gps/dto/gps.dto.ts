import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GpsPointDto {
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @IsOptional()
  @IsNumber()
  altitude?: number;

  @IsOptional()
  @IsNumber()
  speed?: number;

  @IsOptional()
  @IsNumber()
  bearing?: number;

  @IsOptional()
  @IsNumber()
  battery_level?: number;

  @IsOptional()
  @IsString()
  network_type?: string;

  @IsOptional()
  @IsBoolean()
  is_mock?: boolean;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsNumber()
  sequence_number?: number;

  @IsNotEmpty()
  @IsDateString()
  timestamp_device: string;
}

export class BatchGpsDto {
  @IsNotEmpty()
  @IsString()
  driver_id: string;

  @IsOptional()
  @IsString()
  job_id?: string;

  @IsOptional()
  @IsString()
  vehicle_id?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GpsPointDto)
  points: GpsPointDto[];
}

export class HeartbeatDto {
  @IsNotEmpty()
  @IsString()
  driver_id: string;

  @IsOptional()
  @IsNumber()
  battery_level?: number;

  @IsOptional()
  @IsString()
  network_type?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  current_job_id?: string;

  @IsOptional()
  @IsString()
  app_state?: string;
}
