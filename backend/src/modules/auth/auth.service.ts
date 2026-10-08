import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/user.entity';
import { UserStatus } from '../../common/enums';
import { LoginDto, RefreshTokenDto, ChangePasswordDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { identifier, password, fcm_token } = loginDto;

    // Search by email or phone
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .leftJoinAndSelect('user.driver_profile', 'driver_profile')
      .where('user.email = :identifier OR user.phone = :identifier', { identifier })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid email/phone or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is suspended or deactivated');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email/phone or password');
    }

    // Update FCM token & last login
    user.last_login_at = new Date();
    if (fcm_token) {
      user.fcm_token = fcm_token;
    }
    await this.userRepository.save(user);

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role?.name,
        permissions: user.role?.permissions?.map((p) => p.permission_code) || [],
        employee_code: user.employee_code,
        driver_profile_id: user.driver_profile?.id || null,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refresh_token, {
        secret: process.env.JWT_REFRESH_SECRET || 'fleet-refresh-super-secret-key-2026',
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['role', 'role.permissions', 'driver_profile'],
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('User account invalid or suspended');
      }

      if (user.token_version !== payload.token_version) {
        throw new UnauthorizedException('Refresh token revoked');
      }

      // Token rotation: increment version or generate new refresh token
      return await this.generateTokens(user);
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      user.token_version += 1;
      await this.userRepository.save(user);
    }
    return { success: true, message: 'Logged out successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(dto.old_password, user.password_hash);
    if (!isMatch) {
      throw new BadRequestException('Current password does not match');
    }

    user.password_hash = await bcrypt.hash(dto.new_password, 10);
    user.token_version += 1; // Invalidate all prior sessions
    await this.userRepository.save(user);

    return { success: true, message: 'Password updated successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role', 'role.permissions', 'driver_profile'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role?.name,
      permissions: user.role?.permissions?.map((p) => p.permission_code) || [],
      employee_code: user.employee_code,
      driver_profile: user.driver_profile || null,
      created_at: user.created_at,
    };
  }

  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role?.name,
      token_version: user.token_version,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'fleet-management-jwt-super-secret-key-2026',
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'fleet-refresh-super-secret-key-2026',
      expiresIn: '7d',
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900,
    };
  }
}
