import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { DriverDutyStatus } from '../../../common/enums';

export class CreateDriverDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsNotEmpty()
  @IsString()
  license_number: string;

  @IsOptional()
  @IsDateString()
  license_expiry?: string;

  @IsOptional()
  @IsString()
  emergency_contact?: string;

  @IsOptional()
  @IsString()
  password?: string;
}

export class UpdateDriverDto {
  @IsOptional()
  @IsString()
  license_number?: string;

  @IsOptional()
  @IsDateString()
  license_expiry?: string;

  @IsOptional()
  @IsString()
  emergency_contact?: string;
}

export class UpdateDutyStatusDto {
  @IsNotEmpty()
  @IsEnum(DriverDutyStatus)
  duty_status: DriverDutyStatus;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class UpdateDriverLocationDto {
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
  speed?: number;

  @IsOptional()
  @IsNumber()
  bearing?: number;
}
