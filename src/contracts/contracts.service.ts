import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractDto, FePaymentTerm } from './dto/create-contract.dto';
import { SelectFreelancerDto } from './dto/select-freelancer.dto';
import { PaymentTerm, Role } from '@prisma/client';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Map FE payment term format to Prisma Enum */
  private mapPaymentTerm(term: FePaymentTerm): PaymentTerm {
    switch (term) {
      case FePaymentTerm.ESCROW_MILESTONE:
        return PaymentTerm.ESCROW_MILESTONE;
      case FePaymentTerm.ESCROW_FULL:
        return PaymentTerm.ESCROW_FULL;
      case FePaymentTerm.NET_15:
        return PaymentTerm.NET_15;
      case FePaymentTerm.NET_30:
        return PaymentTerm.NET_30;
    }
  }

  async createContract(
    userId: string,
    userRole: string,
    dto: CreateContractDto,
  ) {
    if (!dto.milestones || dto.milestones.length === 0) {
      throw new BadRequestException('Hợp đồng phải có ít nhất 1 milestone');
    }

    // 1. Calculate total value from milestones
    const totalValue = dto.milestones.reduce((sum, ms) => sum + ms.budget, 0);

    // 2. Resolve freelancerId and clientId
    // Since FE currently only sends `partnerName` instead of `partnerId`,
    // we find a mock partner in the DB to satisfy Prisma Foreign Key constraints.
    let freelancerId = userId;
    let clientId = userId;

    if (userRole === 'freelancer') {
      const mockClient = await this.prisma.user.findFirst({
        where: { role: Role.CLIENT },
      });
      clientId = mockClient ? mockClient.id : userId; // fallback to self if no client exists
    } else {
      const mockFreelancer = await this.prisma.user.findFirst({
        where: { role: Role.FREELANCER },
      });
      freelancerId = mockFreelancer ? mockFreelancer.id : userId;
    }

    // 3. Create Contract + Milestones in a transaction
    const contract = await this.prisma.contract.create({
      data: {
        title: dto.title,
        partnerName: dto.partnerName,
        description: dto.description,
        paymentTerm: this.mapPaymentTerm(dto.paymentTerm),
        specialTerms: dto.specialTerms,
        totalValue: totalValue,
        freelancerId,
        clientId,
        // Inline milestone creation
        milestones: {
          create: dto.milestones.map((ms) => ({
            name: ms.name,
            budget: ms.budget,
            deadline: ms.deadline,
          })),
        },
      },
      include: {
        milestones: true,
      },
    });

    // Match the exact FE Response Shape
    return {
      id: contract.id,
      title: contract.title,
      partnerName: contract.partnerName,
      status: contract.status.toLowerCase(),
      totalValue: Number(contract.totalValue),
      escrowedAmount: Number(contract.escrowedAmount),
      startDate: contract.startDate,
      endDate: contract.endDate,
      progressPercent: contract.progressPercent,
      description: contract.description,
      paymentTerm: dto.paymentTerm, // Return original string enum
      specialTerms: contract.specialTerms,
      freelancerId: contract.freelancerId,
      clientId: contract.clientId,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
      milestones: contract.milestones.map((ms) => ({
        id: ms.id,
        name: ms.name,
        budget: ms.budget,
        deadline: ms.deadline,
        status: ms.status.toLowerCase(),
        progressPercent: ms.progressPercent,
      })),
    };
  }

  async selectFreelancerAndCreateDraftContract(clientId: string, dto: SelectFreelancerDto) {
    const { jobId, freelancerId } = dto;
    
    // Validate Job
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new BadRequestException('Job không tồn tại');
    }
    if (job.clientId !== clientId) {
      throw new BadRequestException('Bạn không có quyền sở hữu Job này');
    }

    // Validate Freelancer
    const freelancer = await this.prisma.user.findUnique({ where: { id: freelancerId } });
    if (!freelancer) {
      throw new BadRequestException('Freelancer không tồn tại');
    }

    // Use transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'DRAFT' },
      });

      const contract = await prisma.contract.create({
        data: {
          title: `Hợp đồng cho: ${job.title}`,
          partnerName: freelancer.fullName,
          status: 'DRAFT',
          totalValue: job.budget,
          clientId,
          freelancerId,
          jobId,
          paymentTerm: 'ESCROW_MILESTONE',
        },
      });

      return contract;
    });

    return {
      message: 'Tạo hợp đồng nháp thành công. Client có thể tiến hành tạo giao dịch Smart Contract (CBOR hex) để ký duyệt.',
      contractId: result.id,
    };
  }
}
