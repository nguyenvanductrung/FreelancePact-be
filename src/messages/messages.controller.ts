import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Messages')
@Controller('contracts/:contractId/messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy lịch sử tin nhắn của hợp đồng' })
  @ApiResponse({ status: 200, description: 'Danh sách tin nhắn phân trang' })
  async getMessages(
    @Param('contractId') contractId: string,
    @Query() pagination: PaginationDto,
    @Request() req: any,
  ) {
    return this.messagesService.getMessages(contractId, req.user.userId, pagination);
  }

  @Post()
  @ApiOperation({ summary: 'Gửi tin nhắn (Rest API + emit qua Socket.io)' })
  @ApiResponse({ status: 201, description: 'Gửi thành công' })
  async sendMessage(
    @Param('contractId') contractId: string,
    @Body() dto: SendMessageDto,
    @Request() req: any,
  ) {
    return this.messagesService.sendMessage(contractId, req.user.userId, dto);
  }
}
