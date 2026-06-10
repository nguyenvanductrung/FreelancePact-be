import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({ description: 'Access Token từ Google gửi về' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}
