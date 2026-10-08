import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { UserStatus } from '../../common/enums';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'fleet-management-jwt-super-secret-key-2026',
    });
  }

  async validate(payload: { sub: string; email: string; token_version: number }) {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: ['role', 'role.permissions', 'driver_profile'],
    });

    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is suspended or inactive');
    }

    if (user.token_version !== payload.token_version) {
      throw new UnauthorizedException('Session has been revoked or expired');
    }

    return user;
  }
}
