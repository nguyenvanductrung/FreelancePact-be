import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { Message } from '@prisma/client';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`[Socket Connected]: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[Socket Disconnected]: ${client.id}`);
  }

  @SubscribeMessage('joinContractRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { contractId: string },
  ) {
    if (data?.contractId) {
      const room = `contract_${data.contractId}`;
      client.join(room);
      console.log(`[Socket ${client.id}] joined room: ${room}`);
    }
  }

  @SubscribeMessage('leaveContractRoom')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { contractId: string },
  ) {
    if (data?.contractId) {
      const room = `contract_${data.contractId}`;
      client.leave(room);
      console.log(`[Socket ${client.id}] left room: ${room}`);
    }
  }

  /**
   * Broadcasts a new message to all clients in the contract room
   */
  broadcastNewMessage(contractId: string, message: Message) {
    const room = `contract_${contractId}`;
    // FE expected type: "text" | "file" | "system"
    const feMessageShape = {
      ...message,
      type: message.type.toLowerCase(), 
    };
    this.server.to(room).emit('newMessage', feMessageShape);
  }
}
