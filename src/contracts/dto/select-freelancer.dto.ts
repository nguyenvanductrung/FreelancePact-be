import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SelectFreelancerDto {
  @ApiProperty({ description: 'ID của Job' })
  @IsString()
  @IsNotEmpty()
  jobId: string;

  @ApiProperty({ description: 'ID của Freelancer được chọn' })
  @IsString()
  @IsNotEmpty()
  freelancerId: string;
}
