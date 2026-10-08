import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JobType, JobStatus, StopType, JobRejectReason, DeliveryFailureReason } from '../../../common/enums';

export class CreateJobStopDto {
  @IsNotEmpty()
  @IsNumber()
  sequence_number: number;

  @IsNotEmpty()
  @IsString()
  location_id: string;

  @IsNotEmpty()
  @IsEnum(StopType)
  stop_type: StopType;

  @IsOptional()
  @IsDateString()
  scheduled_time?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CreateJobDto {
  @IsNotEmpty()
  @IsString()
  order_id: string;

  @IsOptional()
  @IsEnum(JobType)
  job_type?: JobType;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsString()
  assigned_driver_id?: string;

  @IsOptional()
  @IsString()
  assigned_vehicle_id?: string;

  @IsOptional()
  @IsNumber()
  estimated_distance_km?: number;

  @IsOptional()
  @IsNumber()
  estimated_duration_mins?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateJobStopDto)
  stops: CreateJobStopDto[];
}

export class AssignJobDto {
  @IsNotEmpty()
  @IsString()
  driver_id: string;

  @IsNotEmpty()
  @IsString()
  vehicle_id: string;
}

export class AcceptJobDto {
  @IsNotEmpty()
  @IsString()
  vehicle_id: string;
}

export class RejectJobDto {
  @IsNotEmpty()
  @IsEnum(JobRejectReason)
  reason: JobRejectReason;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class StopArrivalDto {
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
  @IsString()
  client_event_id?: string;

  @IsOptional()
  @IsString()
  source?: 'GEOFENCE' | 'MANUAL';
}

export class StopFailureDto {
  @IsNotEmpty()
  @IsEnum(DeliveryFailureReason)
  reason: DeliveryFailureReason;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  client_event_id?: string;

  @IsOptional()
  @IsArray()
  photo_urls?: string[];
}
