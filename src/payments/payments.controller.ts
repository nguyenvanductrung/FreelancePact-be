import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('contracts/:contractId/payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy lịch sử thanh toán theo hợp đồng' })
  async getPayments(
    @Request() req: any,
    @Param('contractId') contractId: string,
  ) {
    return this.paymentsService.getPaymentsByContract(req.user.userId, contractId);
  }
}
