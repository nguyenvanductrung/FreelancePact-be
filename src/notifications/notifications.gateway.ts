import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { Notification } from '@prisma/client';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {}

  @SubscribeMessage('joinUserRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    if (data?.userId) {
      const room = `user_${data.userId}`;
      client.join(room);
      console.log(`[Socket ${client.id}] joined room: ${room}`);
    }
  }

  @SubscribeMessage('leaveUserRoom')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    if (data?.userId) {
      const room = `user_${data.userId}`;
      client.leave(room);
      console.log(`[Socket ${client.id}] left room: ${room}`);
    }
  }

  /** Broadcasts notification to a specific user */
  emitNotification(userId: string, notification: Notification) {
    this.server.to(`user_${userId}`).emit('notification', notification);
  }
}
