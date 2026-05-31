import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubmitMilestoneDto {
  @ApiProperty({ example: 'Đã hoàn thành thiết kế theo yêu cầu' })
  @IsString()
  @IsNotEmpty()
  submissionNote: string;

  @ApiPropertyOptional({ example: ['https://example.com/file1.pdf'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileUrls?: string[];
}

export class RejectMilestoneDto {
  @ApiProperty({ example: 'Logo bị mờ, cần đổi màu chủ đạo' })
  @IsString()
  @IsNotEmpty()
  rejectionNote: string;
}
