import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from './database/data-source';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { LocationsModule } from './modules/locations/locations.module';
import { OrdersModule } from './modules/orders/orders.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { GpsModule } from './modules/gps/gps.module';
import { PodModule } from './modules/pod/pod.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { SettingsModule } from './modules/settings/settings.module';
import { DistributionModule } from './modules/distribution/distribution.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    TypeOrmModule.forRoot(AppDataSource.options),
    AuthModule,
    UsersModule,
    DriversModule,
    VehiclesModule,
    LocationsModule,
    OrdersModule,
    JobsModule,
    GpsModule,
    PodModule,
    ReportsModule,
    AuditModule,
    NotificationsModule,
    WebSocketModule,
    SettingsModule,
    DistributionModule,
  ],
})
export class AppModule {}
