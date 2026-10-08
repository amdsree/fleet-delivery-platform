import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  identifier: string; // Email or Phone

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  fcm_token?: string;

  @IsOptional()
  @IsString()
  device_info?: string;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refresh_token: string;
}

export class ChangePasswordDto {
  @IsNotEmpty()
  @IsString()
  old_password: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  new_password: string;
}
