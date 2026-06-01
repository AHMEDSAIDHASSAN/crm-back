import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { WhatsAppWebService } from './whatsapp-web.service';

@WebSocketGateway({ namespace: '/whatsapp-web', cors: { origin: '*' } })
export class WhatsAppWebGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(WhatsAppWebGateway.name);

  constructor(private readonly waService: WhatsAppWebService) {}

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      let userId = 'system';
      if (token) {
        const secret = process.env.JWT_SECRET || 'secretKey';
        const payload: any = jwt.verify(token, secret);
        userId = String(payload.sub);
      }

      (client as any).userId = userId;
      client.join(`user_${userId}`);

      this.waService.registerSocket(userId, client.id, (status, extra) => {
        this.server.to(`user_${userId}`).emit('wa:status', { status, ...extra });
      });

      client.emit('wa:status', this.waService.getState(userId));
      this.logger.log(`Socket ${client.id} connected as user ${userId}`);
    } catch (err) {
      this.logger.warn(`Socket auth failed: ${(err as Error).message}`);
      client.emit('wa:status', { status: 'idle' });
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    if (userId) {
      this.waService.unregisterSocket(userId, client.id);
      this.logger.log(`Socket ${client.id} disconnected (user ${userId})`);
    }
  }

  @SubscribeMessage('wa:start')
  async handleStart(client: Socket) {
    const userId = (client as any).userId ?? 'system';
    await this.waService.initializeSession(userId);
  }

  @SubscribeMessage('wa:logout')
  async handleLogout(client: Socket) {
    const userId = (client as any).userId ?? 'system';
    await this.waService.logoutSession(userId);
  }

  @SubscribeMessage('wa:get-state')
  handleGetState(client: Socket) {
    const userId = (client as any).userId ?? 'system';
    client.emit('wa:status', this.waService.getState(userId));
  }
}
