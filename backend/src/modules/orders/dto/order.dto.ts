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
import { OrderStatus } from '../../../common/enums';

export class CreateOrderItemDto {
  @IsNotEmpty()
  @IsString()
  product_name: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  weight_kg: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  volume_m3: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CreateOrderDto {
  @IsNotEmpty()
  @IsString()
  pickup_location_id: string;

  @IsNotEmpty()
  @IsString()
  delivery_location_id: string;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsDateString()
  requested_pickup_time?: string;

  @IsOptional()
  @IsDateString()
  requested_delivery_time?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  pickup_location_id?: string;

  @IsOptional()
  @IsString()
  delivery_location_id?: string;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsDateString()
  requested_pickup_time?: string;

  @IsOptional()
  @IsDateString()
  requested_delivery_time?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsNotEmpty()
  @IsString()
  change_reason: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];
}

export class CancelOrderDto {
  @IsNotEmpty()
  @IsString()
  reason: string;
}
