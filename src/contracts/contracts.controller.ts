import { Body, Controller, Post, Request, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
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
}
