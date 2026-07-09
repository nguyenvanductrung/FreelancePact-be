import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  RejectMilestoneDto,
  SubmitMilestoneDto,
} from './dto/milestone-action.dto';
import {
  ContractStatus,
  MessageType,
  MilestoneStatus,
  NotificationType,
  PaymentStatus,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Freelancer submits a milestone for review.
   */
  async submit(milestoneId: string, userId: string, dto: SubmitMilestoneDto) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { contract: true },
    });

    if (!milestone) throw new NotFoundException('Milestone không tồn tại');

    if (milestone.contract.freelancerId !== userId) {
      throw new ForbiddenException(
        'Chỉ Freelancer mới có quyền submit milestone',
      );
    }

    if (
      milestone.status !== MilestoneStatus.ACTIVE &&
      milestone.status !== MilestoneStatus.REVISION_REQUESTED
    ) {
      throw new BadRequestException(
        'Trạng thái milestone không hợp lệ để submit',
      );
    }

    // Update milestone
    await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: MilestoneStatus.SUBMITTED,
        submittedAt: new Date(),
        submissionNote: dto.submissionNote,
        files: dto.fileUrls?.length
          ? {
              create: dto.fileUrls.map((url) => ({ url })),
            }
          : undefined,
      },
    });

    // Notify the Client
    await this.notificationsService.create(
      milestone.contract.clientId,
      NotificationType.MILESTONE_SUBMITTED,
      'Milestone đã được nộp',
      `Freelancer đã nộp sản phẩm cho milestone: ${milestone.name}`,
      { contractId: milestone.contractId, milestoneId: milestone.id },
    );

    // Return the updated contract detail shape
    return this.getContractDetailShape(milestone.contractId);
  }

  /**
   * Client rejects a submitted milestone, requiring revisions.
   */
  async reject(milestoneId: string, userId: string, dto: RejectMilestoneDto) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { contract: true },
    });

    if (!milestone) throw new NotFoundException('Milestone không tồn tại');

    if (milestone.contract.clientId !== userId) {
      throw new ForbiddenException('Chỉ Client mới có quyền reject milestone');
    }

    if (milestone.status !== MilestoneStatus.SUBMITTED) {
      throw new BadRequestException('Milestone chưa được submit');
    }

    // Update milestone
    await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: MilestoneStatus.REVISION_REQUESTED,
        rejectionNote: dto.rejectionNote,
      },
    });

    // Auto-create system message in chat
    await this.prisma.message.create({
      data: {
        contractId: milestone.contractId,
        senderId: userId,
        senderName: 'Hệ thống',
        type: MessageType.SYSTEM,
        text: `Client yêu cầu chỉnh sửa: ${dto.rejectionNote}`,
        milestoneNote: milestone.name,
      },
    });

    // Notify the Freelancer
    await this.notificationsService.create(
      milestone.contract.freelancerId,
      NotificationType.MILESTONE_REJECTED,
      'Yêu cầu chỉnh sửa',
      `Client đã yêu cầu chỉnh sửa milestone: ${milestone.name}`,
      { contractId: milestone.contractId, milestoneId: milestone.id },
    );

    return this.getContractDetailShape(milestone.contractId);
  }

  /**
   * Client approves a submitted milestone → triggers mock payment release.
   */
  async approve(milestoneId: string, userId: string) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { contract: { include: { milestones: { orderBy: { createdAt: 'asc' } } } } },
    });

    if (!milestone) throw new NotFoundException('Milestone không tồn tại');

    if (milestone.contract.clientId !== userId) {
      throw new ForbiddenException('Chỉ Client mới có quyền approve milestone');
    }

    if (milestone.status !== MilestoneStatus.SUBMITTED) {
      throw new BadRequestException(
        'Milestone phải ở trạng thái SUBMITTED mới có thể approve',
      );
    }

    const contract = milestone.contract;
    const milestoneAmount = Number(milestone.budget);
    const newEscrowedAmount = Math.max(
      0,
      Number(contract.escrowedAmount) - milestoneAmount,
    );

    // Find the next PENDING milestone
    const nextMilestone = contract.milestones.find(
      (m) => m.status === MilestoneStatus.PENDING,
    );

    // Check if all milestones will be COMPLETED after this approve
    const otherMilestones = contract.milestones.filter(
      (m) => m.id !== milestoneId,
    );
    const allCompleted = otherMilestones.every(
      (m) => m.status === MilestoneStatus.COMPLETED,
    );

    const completedCount = otherMilestones.filter(
      (m) => m.status === MilestoneStatus.COMPLETED,
    ).length + 1; // +1 for current
    const totalCount = contract.milestones.length;
    const newProgress = Math.round((completedCount / totalCount) * 100);

    await this.prisma.$transaction(async (tx) => {
      // 1. Mark milestone as COMPLETED
      await tx.milestone.update({
        where: { id: milestoneId },
        data: {
          status: MilestoneStatus.COMPLETED,
          progressPercent: 100,
          completedAt: new Date(),
        },
      });

      // 2. Create Payment record (mock release)
      await tx.payment.create({
        data: {
          contractId: contract.id,
          milestoneId: milestoneId,
          amount: milestoneAmount,
          status: PaymentStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      // 3. Update contract escrowedAmount + progressPercent
      await tx.contract.update({
        where: { id: contract.id },
        data: {
          escrowedAmount: newEscrowedAmount,
          progressPercent: newProgress,
          ...(allCompleted && {
            status: ContractStatus.COMPLETED,
            endDate: new Date().toISOString().split('T')[0],
          }),
        },
      });

      // 4. Activate next milestone (if exists)
      if (nextMilestone && !allCompleted) {
        await tx.milestone.update({
          where: { id: nextMilestone.id },
          data: { status: MilestoneStatus.ACTIVE },
        });
      }

      // 5. System message in chat
      await tx.message.create({
        data: {
          contractId: contract.id,
          senderId: userId,
          senderName: 'Hệ thống',
          type: MessageType.SYSTEM,
          text: allCompleted
            ? `🎉 Hợp đồng hoàn thành! Milestone cuối "${milestone.name}" đã được nghiệm thu. ${milestoneAmount.toLocaleString()} ADA đã được giải ngân.`
            : `✅ Client đã nghiệm thu milestone "${milestone.name}". ${milestoneAmount.toLocaleString()} ADA đã được giải ngân cho Freelancer.`,
          milestoneNote: milestone.name,
        },
      });
    });

    // 6. Notifications (outside transaction)
    await this.notificationsService.create(
      contract.freelancerId,
      NotificationType.PAYMENT_RELEASED,
      `💰 Thanh toán ${milestoneAmount.toLocaleString()} ADA`,
      `Client đã nghiệm thu milestone "${milestone.name}" và giải ngân ${milestoneAmount.toLocaleString()} ADA cho bạn.`,
      { contractId: contract.id, milestoneId: milestone.id },
    );

    if (allCompleted) {
      await this.notificationsService.create(
        contract.freelancerId,
        NotificationType.NFT_MINTED,
        '🏆 NFT Uy tín đã được đúc!',
        `Hợp đồng "${contract.title}" hoàn thành xuất sắc. NFT chứng nhận on-chain đã được mint vào ví của bạn!`,
        { contractId: contract.id },
      );
    }

    await this.notificationsService.create(
      contract.clientId,
      NotificationType.MILESTONE_APPROVED,
      'Milestone đã được xác nhận',
      `Bạn đã nghiệm thu milestone "${milestone.name}". Thanh toán ${milestoneAmount.toLocaleString()} ADA đã hoàn tất.`,
      { contractId: contract.id, milestoneId: milestone.id },
    );

    return this.getContractDetailShape(contract.id);
  }

  /** Helper to return the full ContractDetail shape for FE */
  private async getContractDetailShape(contractId: string) {
    const contract = await this.prisma.contract.findUniqueOrThrow({
      where: { id: contractId },
      include: { milestones: { include: { files: true } } },
    });

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
      paymentTerm: contract.paymentTerm,
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
        submissionNote: ms.submissionNote,
        rejectionNote: ms.rejectionNote,
        submittedAt: ms.submittedAt,
        files: ms.files.map((f) => f.url),
      })),
    };
  }
}
