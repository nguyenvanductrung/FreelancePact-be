import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RejectMilestoneDto, SubmitMilestoneDto } from './dto/milestone-action.dto';
import { MessageType, MilestoneStatus, NotificationType } from '@prisma/client';
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
  async submit(
    milestoneId: string,
    userId: string,
    dto: SubmitMilestoneDto,
  ) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { contract: true },
    });

    if (!milestone) throw new NotFoundException('Milestone không tồn tại');

    if (milestone.contract.freelancerId !== userId) {
      throw new ForbiddenException('Chỉ Freelancer mới có quyền submit milestone');
    }

    if (
      milestone.status !== MilestoneStatus.ACTIVE &&
      milestone.status !== MilestoneStatus.REVISION_REQUESTED
    ) {
      throw new BadRequestException('Trạng thái milestone không hợp lệ để submit');
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
  async reject(
    milestoneId: string,
    userId: string,
    dto: RejectMilestoneDto,
  ) {
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
        files: ms.files.map(f => f.url),
      })),
    };
  }
}
