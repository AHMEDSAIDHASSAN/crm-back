import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token — disconnecting`);
        client.disconnect();
        return;
      }

      const secret = process.env.JWT_SECRET || 'secretKey';
      const payload: any = jwt.verify(token, secret);
      const userId = payload.sub;

      if (!userId) {
        client.disconnect();
        return;
      }

      const uid = String(userId);
      (client as any).userId = uid;
      client.join(`user_${uid}`);
      this.logger.log(`User ${uid} connected (socket ${client.id})`);
    } catch (err) {
      this.logger.warn(`Socket auth failed for ${client.id}: ${(err as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    if (userId) {
      this.logger.log(`User ${userId} disconnected (socket ${client.id})`);
    }
  }

  sendToUser(userId: number | bigint | string, payload: Record<string, any>) {
    const room = `user_${String(userId)}`;
    this.server.to(room).emit('notification', payload);
  }
}
