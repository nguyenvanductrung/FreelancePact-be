import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApplicationDto {
  @ApiPropertyOptional({
    example: 'Tôi có kinh nghiệm 5 năm làm design...',
    description: 'Thư giới thiệu',
  })
  @IsString()
  @IsOptional()
  coverLetter?: string;

  @ApiPropertyOptional({
    example: 90,
    description: 'Ngân sách đề xuất bằng ADA',
  })
  @IsNumber()
  @IsOptional()
  proposedBudget?: number;
}
