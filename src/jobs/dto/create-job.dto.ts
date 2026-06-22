import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJobDto {
  @ApiProperty({
    example: 'Thiết kế Logo cho dự án DeFi',
    description: 'Tiêu đề công việc',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    example: 'Cần thiết kế logo phong cách tối giản...',
    description: 'Mô tả chi tiết',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 100.5, description: 'Ngân sách bằng ADA' })
  @IsNumber()
  @Min(0)
  budget: number;

  @ApiPropertyOptional({ example: '1 tháng', description: 'Thời gian dự kiến' })
  @IsString()
  @IsOptional()
  duration?: string;

  @ApiPropertyOptional({
    example: '2026-08-01T00:00:00Z',
    description: 'Hạn chót ứng tuyển',
  })
  @IsDateString()
  @IsOptional()
  deadline?: string;

  @ApiProperty({
    type: [String],
    example: ['Figma', 'Illustrator'],
    description: 'Kỹ năng yêu cầu',
  })
  @IsArray()
  @IsString({ each: true })
  skills: string[];
}
