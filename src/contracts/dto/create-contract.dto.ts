import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export enum FePaymentTerm {
  ESCROW_MILESTONE = 'escrow-milestone',
  ESCROW_FULL = 'escrow-full',
  NET_15 = 'net-15',
  NET_30 = 'net-30',
}

export class CreateMilestoneDto {
  @ApiProperty({ example: 'Liên ý tưởng thiết kế' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 5000000, description: 'Ngân sách VND' })
  @IsInt()
  @Min(1)
  budget: number;

  @ApiProperty({ example: '2024-11-15' })
  @IsString()
  @IsNotEmpty()
  deadline: string;
}

export class CreateContractDto {
  @ApiProperty({ example: 'Thiết kế Website Thương mại điện tử' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Acme Corporation' })
  @IsString()
  @IsNotEmpty()
  partnerName: string;

  @ApiPropertyOptional({ example: 'Mô tả ngắn gọn về phạm vi công việc...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: FePaymentTerm, example: FePaymentTerm.ESCROW_MILESTONE })
  @IsEnum(FePaymentTerm)
  paymentTerm: FePaymentTerm;

  @ApiPropertyOptional({ example: 'Bảo mật NDA trong 2 năm' })
  @IsOptional()
  @IsString()
  specialTerms?: string;

  @ApiProperty({ type: [CreateMilestoneDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMilestoneDto)
  milestones: CreateMilestoneDto[];
}
