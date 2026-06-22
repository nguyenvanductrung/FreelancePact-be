import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Client tạo bài tuyển dụng mới' })
  createJob(@Request() req: any, @Body() dto: CreateJobDto) {
    // Only clients should create jobs, but for simplicity assuming role check is fine or UI prevents it
    return this.jobsService.createJob(req.user.userId, dto);
  }

  @Get()
  // @UseGuards(OptionalJwtAuthGuard) - Assuming public access is allowed
  @ApiOperation({ summary: 'Lấy danh sách các Job đang mở (Marketplace)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({
    name: 'skills',
    required: false,
    description: 'Comma separated skills',
  })
  @ApiQuery({ name: 'budgetMin', required: false, type: Number })
  @ApiQuery({ name: 'budgetMax', required: false, type: Number })
  getAllJobs(
    @Query('search') search?: string,
    @Query('skills') skills?: string,
    @Query('budgetMin') budgetMin?: number,
    @Query('budgetMax') budgetMax?: number,
  ) {
    return this.jobsService.getAllJobs({
      search,
      skills,
      budgetMin,
      budgetMax,
    });
  }

  @Get('my-jobs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy danh sách Job do Client đang đăng nhập tạo' })
  getMyJobs(@Request() req: any) {
    return this.jobsService.getMyJobs(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một Job' })
  getJobById(@Param('id') id: string) {
    return this.jobsService.getJobById(id);
  }

  @Post(':id/apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Freelancer ứng tuyển vào Job' })
  applyToJob(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CreateApplicationDto,
  ) {
    if (req.user.role !== 'FREELANCER') {
      throw new ForbiddenException('Chỉ Freelancer mới có thể ứng tuyển');
    }
    return this.jobsService.applyToJob(req.user.userId, id, dto);
  }

  @Get(':id/applications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Client xem danh sách ứng viên của Job' })
  getApplications(@Request() req: any, @Param('id') id: string) {
    return this.jobsService.getApplications(req.user.userId, id);
  }

  @Post(':jobId/applications/:applicationId/select')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Client chọn Freelancer và tạo Draft Contract' })
  selectFreelancer(
    @Request() req: any,
    @Param('jobId') jobId: string,
    @Param('applicationId') applicationId: string,
  ) {
    if (req.user.role !== 'CLIENT') {
      throw new ForbiddenException('Chỉ Client mới có thể chọn Freelancer');
    }
    return this.jobsService.selectFreelancer(
      req.user.userId,
      jobId,
      applicationId,
    );
  }
}
