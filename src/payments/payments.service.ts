import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /contracts/:contractId/payments
   * List all payment records for a contract
   */
  async getPaymentsByContract(userId: string, contractId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) throw new NotFoundException('Hợp đồng không tồn tại');

    if (contract.clientId !== userId && contract.freelancerId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem lịch sử thanh toán này');
    }

    const payments = await this.prisma.payment.findMany({
      where: { contractId },
      include: {
        milestone: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((p) => ({
      id: p.id,
      contractId: p.contractId,
      milestoneId: p.milestoneId,
      milestoneName: p.milestone?.name ?? null,
      amount: Number(p.amount),
      status: p.status.toLowerCase(),
      createdAt: p.createdAt,
      completedAt: p.completedAt,
    }));
  }
}
