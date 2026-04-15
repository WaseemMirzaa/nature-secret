import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export const EVENTS = {
  ORDER_CREATED: 'order:created',
  ORDER_UPDATED: 'order:updated',
  DASHBOARD_REFRESH: 'dashboard:refresh',
} as const;

type JwtPayloadShape = { type?: string; role?: string; sub?: string };

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000' },
  path: '/api/v1/ws',
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private adminRoom = 'admin';

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    const fromAuth = client.handshake?.auth?.token;
    const header = client.handshake?.headers?.authorization;
    const bearer =
      typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const token = (typeof fromAuth === 'string' && fromAuth.trim()) || bearer || '';
    if (!token) {
      client.disconnect(true);
      return;
    }
    const secret =
      this.config.get<string>('JWT_SECRET') || process.env.JWT_SECRET || 'nature-secret-jwt-change-in-production';
    try {
      const payload = this.jwt.verify<JwtPayloadShape>(token, { secret });
      if (payload.type === 'customer') {
        client.disconnect(true);
        return;
      }
      if (payload.role !== 'admin' && payload.role !== 'staff') {
        client.disconnect(true);
        return;
      }
      void client.join(this.adminRoom);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect() {}

  emitOrderCreated(order: { id: string; status: string; createdAt?: string }) {
    this.server.to(this.adminRoom).emit(EVENTS.ORDER_CREATED, order);
  }

  emitOrderUpdated(order: { id: string; status: string }) {
    this.server.to(this.adminRoom).emit(EVENTS.ORDER_UPDATED, order);
  }

  emitDashboardRefresh() {
    this.server.to(this.adminRoom).emit(EVENTS.DASHBOARD_REFRESH, {});
  }
}
