import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { SelectFreelancerDto } from './dto/select-freelancer.dto';

@ApiTags('Contracts')
@Controller('contracts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo hợp đồng mới với các milestones' })
  @ApiResponse({
    status: 201,
    description: 'Tạo thành công, trả về ContractDetail',
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async createContract(@Request() req: any, @Body() dto: CreateContractDto) {
    return this.contractsService.createContract(
      req.user.userId,
      req.user.role,
      dto,
    );
  }

  @Post('select-freelancer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chọn Freelancer cho Job và Khởi tạo Hợp đồng Nháp (Cardano)' })
  @ApiResponse({ status: 200, description: 'Tạo thành công hợp đồng nháp' })
  async selectFreelancer(
    @Request() req: any,
    @Body() dto: SelectFreelancerDto,
  ) {
    return this.contractsService.selectFreelancerAndCreateDraftContract(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách hợp đồng của user hiện tại' })
  @ApiResponse({ status: 200, description: 'Danh sách hợp đồng phân trang' })
  async getContracts(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const size = pageSize ? parseInt(pageSize, 10) : 10;
    return this.contractsService.findAll(req.user.userId, pageNumber, size);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một hợp đồng' })
  @ApiResponse({ status: 200, description: 'Chi tiết hợp đồng' })
  async getContract(@Request() req: any, @Param('id') id: string) {
    const data = await this.contractsService.findOne(req.user.userId, id);
    return { data };
  }
}
