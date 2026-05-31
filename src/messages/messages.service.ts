import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { MessagesGateway } from './messages.gateway';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: MessagesGateway,
  ) {}

  /**
   * Retrieves messages for a contract with pagination
   */
  async getMessages(contractId: string, userId: string, pagination: PaginationDto) {
    // 1. Verify access
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) throw new NotFoundException('Hợp đồng không tồn tại');
    if (contract.freelancerId !== userId && contract.clientId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem tin nhắn hợp đồng này');
    }

    // 2. Fetch paginated messages
    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { contractId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.message.count({ where: { contractId } }),
    ]);

    // Format to match FE expecting "type": "text" | "file" | "system"
    const formattedData = data.map((msg) => ({
      ...msg,
      type: msg.type.toLowerCase(),
      // Format file object as FE expects if it's a file
      file: msg.type === 'FILE' && msg.fileUrl ? {
        name: msg.fileName,
        sizeBytes: msg.fileSizeBytes,
        url: msg.fileUrl,
        milestoneNote: msg.milestoneNote,
      } : null,
    }));

    return {
      data: formattedData,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Sends a message, saves it to DB, and broadcasts via Socket.io
   */
  async sendMessage(contractId: string, userId: string, dto: SendMessageDto) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) throw new NotFoundException('Hợp đồng không tồn tại');
    if (contract.freelancerId !== userId && contract.clientId !== userId) {
      throw new ForbiddenException('Bạn không có quyền gửi tin nhắn hợp đồng này');
    }

    const sender = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const message = await this.prisma.message.create({
      data: {
        contractId,
        senderId: userId,
        senderName: sender.fullName,
        senderAvatar: sender.avatarUrl,
        type: dto.type,
        text: dto.text,
        fileUrl: dto.fileUrl,
        fileName: dto.fileName,
        fileSizeBytes: dto.fileSizeBytes,
      },
    });

    // Broadcast in real-time
    this.gateway.broadcastNewMessage(contractId, message);

    return {
      ...message,
      type: message.type.toLowerCase(),
      file: message.type === 'FILE' && message.fileUrl ? {
        name: message.fileName,
        sizeBytes: message.fileSizeBytes,
        url: message.fileUrl,
        milestoneNote: message.milestoneNote,
      } : null,
    };
  }
}
