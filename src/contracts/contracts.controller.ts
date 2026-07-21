import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';

@ApiTags('Contracts')
@Controller('contracts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo hợp đồng mới với các milestones' })
  @ApiResponse({ status: 201, description: 'Tạo thành công, trả về ContractDetail' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async createContract(@Request() req: any, @Body() dto: CreateContractDto) {
    return this.contractsService.createContract(
      req.user.userId,
      req.user.role,
      dto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách hợp đồng của user đang đăng nhập' })
  async getMyContracts(@Request() req: any) {
    return this.contractsService.getMyContracts(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết hợp đồng theo ID' })
  @ApiResponse({ status: 200, description: 'Trả về ContractDetail' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hợp đồng' })
  async getContractById(@Request() req: any, @Param('id') id: string) {
    return this.contractsService.getContractById(req.user.userId, id);
  }

  @Post(':id/fund/build')
  @ApiOperation({ summary: 'Client khởi tạo giao dịch nạp ADA vào Escrow' })
  @ApiResponse({ status: 200, description: 'Trả về unsignedTxCbor' })
  async buildFundTx(@Request() req: any, @Param('id') id: string, @Body() body: { clientWalletAddress: string }) {
    return this.contractsService.buildFundEscrowTx(req.user.userId, id, body.clientWalletAddress);
  }

  @Post(':id/fund/submit')
  @ApiOperation({ summary: 'Client submit giao dịch đã ký' })
  @ApiResponse({ status: 200, description: 'Trả về txHash' })
  async submitFundTx(@Request() req: any, @Param('id') id: string, @Body() body: { signedTxCbor: string }) {
    return this.contractsService.submitFundEscrowTx(req.user.userId, id, body.signedTxCbor);
  }
}
