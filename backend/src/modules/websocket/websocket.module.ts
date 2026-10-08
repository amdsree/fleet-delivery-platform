import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { FleetGateway } from './fleet.gateway';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fleet-management-jwt-super-secret-key-2026',
    }),
  ],
  providers: [FleetGateway],
  exports: [FleetGateway],
})
export class WebSocketModule {}
