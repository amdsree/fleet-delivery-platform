import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class SubmitPodDto {
  @IsNotEmpty()
  @IsString()
  job_id: string;

  @IsNotEmpty()
  @IsString()
  stop_id: string;

  @IsNotEmpty()
  @IsString()
  receiver_name: string;

  @IsOptional()
  @IsString()
  receiver_phone?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  delivered_quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  damaged_quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shortage_quantity?: number;

  @IsOptional()
  @IsString()
  signature_url?: string;

  @IsOptional()
  @IsArray()
  photo_urls?: string[];

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
  @IsNumber()
  accuracy?: number;

  @IsOptional()
  @IsString()
  client_event_id?: string;
}
