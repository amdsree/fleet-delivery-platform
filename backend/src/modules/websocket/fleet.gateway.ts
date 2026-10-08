import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/realtime',
})
export class FleetGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FleetGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token - limiting to public rooms`);
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'fleet-management-jwt-super-secret-key-2026',
      });

      client.data.user = payload;

      // Automatically join personal driver room if driver
      if (payload.role === 'DRIVER') {
        client.join(`driver:${payload.sub}`);
      } else if (payload.role === 'ADMIN' || payload.role === 'GODOWN_MANAGER') {
        client.join('fleet:admin');
      }

      this.logger.log(`Client ${client.id} authenticated as ${payload.email} (${payload.role})`);
    } catch (e) {
      this.logger.warn(`Client ${client.id} authentication failed: ${e.message}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('subscribe:fleet')
  handleSubscribeFleet(@ConnectedSocket() client: Socket) {
    client.join('fleet:admin');
    return { status: 'subscribed', room: 'fleet:admin' };
  }

  @SubscribeMessage('subscribe:order')
  handleSubscribeOrder(@ConnectedSocket() client: Socket, @MessageBody() orderId: string) {
    client.join(`order:${orderId}`);
    return { status: 'subscribed', room: `order:${orderId}` };
  }

  // Broadcasters
  broadcastDriverLocation(data: {
    driver_id: string;
    latitude: number;
    longitude: number;
    speed?: number;
    bearing?: number;
    accuracy?: number;
    duty_status?: string;
  }) {
    if (this.server) {
      this.server.to('fleet:admin').emit('driver:location_updated', data);
    }
  }

  broadcastJobOffer(driverId: string, jobData: any) {
    if (this.server) {
      this.server.to(`driver:${driverId}`).emit('job:offered', jobData);
      this.server.to('fleet:admin').emit('job:status_updated', {
        job_id: jobData.id,
        status: 'OFFERED',
        driver_id: driverId,
      });
    }
  }

  broadcastJobStatus(jobId: string, status: string, details?: any) {
    if (this.server) {
      this.server.to('fleet:admin').emit('job:status_updated', {
        job_id: jobId,
        status,
        ...details,
      });
    }
  }

  broadcastStopArrival(stopData: any) {
    if (this.server) {
      this.server.to('fleet:admin').emit('stop:arrived', stopData);
    }
  }

  broadcastAlert(alert: { type: string; title: string; message: string; payload?: any }) {
    if (this.server) {
      this.server.to('fleet:admin').emit('fleet:alert', alert);
    }
  }

  broadcastToDriver(driverUserId: string, alert: { type: string; title: string; message: string; payload?: any }) {
    if (this.server) {
      this.server.to(`driver:${driverUserId}`).emit('driver:alert', alert);
    }
  }

  broadcastToStakeholders(data: {
    event: string;
    title: string;
    message: string;
    payload?: any;
    driverUserId?: string;
  }) {
    if (this.server) {
      this.server.to('fleet:admin').emit('fleet:alert', data);
      this.server.to('fleet:admin').emit(`event:${data.event.toLowerCase()}`, data);

      if (data.driverUserId) {
        this.server.to(`driver:${data.driverUserId}`).emit('driver:alert', data);
        this.server.to(`driver:${data.driverUserId}`).emit(`event:${data.event.toLowerCase()}`, data);
      }
    }
  }
}
