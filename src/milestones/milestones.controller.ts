import {
  Body,
  Controller,
  Param,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MilestonesService } from './milestones.service';
import { RejectMilestoneDto, SubmitMilestoneDto } from './dto/milestone-action.dto';

@ApiTags('Milestones')
@Controller('milestones')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Patch(':id/submit')
  @ApiOperation({ summary: 'Freelancer nộp sản phẩm cho Milestone' })
  @ApiResponse({ status: 200, description: 'Trả về ContractDetail đã cập nhật' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  async submit(
    @Param('id') milestoneId: string,
    @Request() req: any,
    @Body() dto: SubmitMilestoneDto,
  ) {
    return this.milestonesService.submit(milestoneId, req.user.userId, dto);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Client từ chối sản phẩm, yêu cầu chỉnh sửa' })
  @ApiResponse({ status: 200, description: 'Trả về ContractDetail đã cập nhật' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  async reject(
    @Param('id') milestoneId: string,
    @Request() req: any,
    @Body() dto: RejectMilestoneDto,
  ) {
    return this.milestonesService.reject(milestoneId, req.user.userId, dto);
  }
}
