import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { MessageType } from '@prisma/client';

export class SendMessageDto {
  @ApiProperty({ enum: ['TEXT', 'FILE', 'SYSTEM'], example: 'TEXT' })
  @IsEnum(MessageType)
  type: MessageType;

  @ApiPropertyOptional({ example: 'Cảm ơn bạn, tôi sẽ xem qua.' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ example: 'https://example.com/file.pdf' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ example: 'design_v1.pdf' })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ example: 2048000 })
  @IsOptional()
  @IsInt()
  fileSizeBytes?: number;
}
