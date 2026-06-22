import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { NotificationsService } from '../notifications/notifications.service';
import {
  JobStatus,
  ApplicationStatus,
  ContractStatus,
  PaymentTerm,
  Prisma,
  NotificationType,
  MessageType,
} from '@prisma/client';

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async createJob(clientId: string, dto: CreateJobDto) {
    return this.prisma.job.create({
      data: {
        title: dto.title,
        description: dto.description,
        budget: dto.budget,
        duration: dto.duration,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        skills: dto.skills,
        clientId,
      },
    });
  }

  async getAllJobs(filters: {
    search?: string;
    skills?: string;
    budgetMin?: number;
    budgetMax?: number;
  }) {
    const whereClause: Prisma.JobWhereInput = { status: JobStatus.OPEN };

    if (filters.search) {
      whereClause.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.skills) {
      const skillsArray = filters.skills.split(',').map((s) => s.trim());
      whereClause.skills = { hasSome: skillsArray };
    }

    if (filters.budgetMin !== undefined || filters.budgetMax !== undefined) {
      whereClause.budget = {};
      if (filters.budgetMin !== undefined)
        whereClause.budget.gte = Number(filters.budgetMin);
      if (filters.budgetMax !== undefined)
        whereClause.budget.lte = Number(filters.budgetMax);
    }

    const jobs = await this.prisma.job.findMany({
      where: whereClause,
      include: {
        client: { select: { id: true, fullName: true, avatarUrl: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return jobs.map((job) => ({
      ...job,
      clientName: job.client.fullName,
      applicationCount: job._count.applications,
      _count: undefined,
      client: undefined,
    }));
  }

  async getMyJobs(clientId: string) {
    return this.prisma.job.findMany({
      where: { clientId },
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getJobById(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        client: { select: { id: true, fullName: true, avatarUrl: true } },
        _count: { select: { applications: true } },
      },
    });

    if (!job) throw new NotFoundException('Job không tồn tại');

    return {
      ...job,
      clientName: job.client.fullName,
      applicationCount: job._count.applications,
      _count: undefined,
      client: undefined,
    };
  }

  async applyToJob(
    freelancerId: string,
    jobId: string,
    dto: CreateApplicationDto,
  ) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job không tồn tại');
    if (job.status !== JobStatus.OPEN)
      throw new BadRequestException('Job này không còn mở tuyển dụng');

    const existingApp = await this.prisma.application.findUnique({
      where: {
        jobId_freelancerId: { jobId, freelancerId },
      },
    });

    if (existingApp) {
      throw new ConflictException('Bạn đã ứng tuyển vào công việc này rồi');
    }

    const application = await this.prisma.application.create({
      data: {
        jobId,
        freelancerId,
        coverLetter: dto.coverLetter,
        proposedBudget: dto.proposedBudget,
      },
    });

    const freelancer = await this.prisma.user.findUnique({
      where: { id: freelancerId },
      select: { id: true, fullName: true, avatarUrl: true, skills: true },
    });

    if (freelancer) {
      await this.notificationsService.create(
        job.clientId,
        NotificationType.NEW_APPLICATION,
        'Có ứng viên mới!',
        `${freelancer.fullName} vừa nộp đơn ứng tuyển vào dự án "${job.title}".`,
        {
          jobId: job.id,
          applicationId: application.id,
          freelancerId: freelancer.id,
          freelancerAvatar: freelancer.avatarUrl,
          skills: freelancer.skills,
        },
      );
    }

    return application;
  }

  async getApplications(clientId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job không tồn tại');
    if (job.clientId !== clientId)
      throw new ForbiddenException('Bạn không phải người tạo Job này');

    const applications = await this.prisma.application.findMany({
      where: { jobId },
      include: {
        freelancer: {
          select: { id: true, fullName: true, rating: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return applications.map((app) => ({
      ...app,
      freelancerName: app.freelancer.fullName,
      freelancerRating: app.freelancer.rating,
      freelancerAvatar: app.freelancer.avatarUrl,
      freelancer: undefined,
    }));
  }

  async selectFreelancer(
    clientId: string,
    jobId: string,
    applicationId: string,
  ) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job không tồn tại');
    if (job.clientId !== clientId)
      throw new ForbiddenException('Bạn không phải người tạo Job này');
    if (job.status !== JobStatus.OPEN)
      throw new BadRequestException('Job này không còn mở tuyển dụng');

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });
    if (!application || application.jobId !== jobId) {
      throw new NotFoundException('Application không hợp lệ');
    }

    const contract = await this.prisma.$transaction(async (tx) => {
      // 1. Cập nhật Job -> DRAFT
      await tx.job.update({
        where: { id: jobId },
        data: { status: JobStatus.DRAFT },
      });

      // 2. Accept Application được chọn
      await tx.application.update({
        where: { id: applicationId },
        data: { status: ApplicationStatus.ACCEPTED },
      });

      // 3. Reject tất cả Application còn lại
      await tx.application.updateMany({
        where: { jobId, id: { not: applicationId } },
        data: { status: ApplicationStatus.REJECTED },
      });

      // 4. Tạo Contract mới ở trạng thái DRAFT
      const newContract = await tx.contract.create({
        data: {
          title: job.title,
          description: job.description,
          clientId: clientId,
          freelancerId: application.freelancerId,
          jobId: jobId,
          partnerName: '', // Sẽ cập nhật sau
          totalValue: job.budget,
          status: ContractStatus.DRAFT,
          paymentTerm: PaymentTerm.ESCROW_MILESTONE,
        },
      });

      // 5. Tạo System Message để khởi tạo Room Chat
      await tx.message.create({
        data: {
          contractId: newContract.id,
          senderId: clientId, // Associate with client or system
          senderName: 'Hệ thống',
          type: MessageType.SYSTEM,
          text: 'Hợp đồng nháp đã được tạo. Hãy bắt đầu thảo luận các điều khoản!',
        },
      });

      return newContract;
    });

    // 6. Gửi thông báo cho Freelancer
    const client = await this.prisma.user.findUnique({
      where: { id: clientId },
      select: { fullName: true, avatarUrl: true },
    });

    if (client) {
      await this.notificationsService.create(
        application.freelancerId,
        NotificationType.FREELANCER_SELECTED,
        'Bạn đã được chọn!',
        `Client ${client.fullName} đã chọn bạn cho dự án "${job.title}". Hợp đồng nháp đã được tạo.`,
        {
          jobId: job.id,
          contractId: contract.id,
          clientId: clientId,
          clientAvatar: client.avatarUrl,
        },
      );
    }

    return { contractId: contract.id };
  }
}
