import { Body, Controller, Get, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfileDto } from './dto/user-profile.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':userId/profile')
  @ApiOperation({ summary: 'Xem hồ sơ đầy đủ của một người dùng (Client hoặc Freelancer)' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfile(@Param('userId') userId: string): Promise<UserProfileDto> {
    return this.usersService.getProfile(userId);
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Cập nhật hồ sơ của chính mình' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  async updateProfile(
    @Request() req: any,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    return this.usersService.updateProfile(req.user.userId, dto);
  }
}
