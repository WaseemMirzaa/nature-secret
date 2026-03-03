import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

export const EVENTS = {
  ORDER_CREATED: 'order:created',
  ORDER_UPDATED: 'order:updated',
  DASHBOARD_REFRESH: 'dashboard:refresh',
} as const;

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000' },
  path: '/api/v1/ws',
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private adminRoom = 'admin';

  handleConnection(client: { id: string; join: (r: string) => void }) {
    client.join(this.adminRoom);
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
