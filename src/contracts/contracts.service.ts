import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractDto, FePaymentTerm } from './dto/create-contract.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { FundEscrowTxBuilder } from './fund-escrow-tx.builder';
import { resolvePaymentKeyHash, BlockfrostProvider } from '@meshsdk/core';
import {
  ContractStatus,
  MilestoneStatus,
  MessageType,
  NotificationType,
  PaymentTerm,
  Role,
} from '@prisma/client';

@Injectable()
export class ContractsService {
  private blockfrostProvider: BlockfrostProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly fundEscrowTxBuilder: FundEscrowTxBuilder,
  ) {
    this.blockfrostProvider = new BlockfrostProvider(process.env.BLOCKFROST_PROJECT_ID || '');
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

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

  /** Return ContractDetail shape matching FE types */
  private formatContractDetail(contract: any) {
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
      milestones: (contract.milestones ?? []).map((ms: any) => ({
        id: ms.id,
        name: ms.name,
        budget: Number(ms.budget),
        deadline: ms.deadline,
        status: ms.status.toLowerCase(),
        progressPercent: ms.progressPercent,
        submissionNote: ms.submissionNote,
        rejectionNote: ms.rejectionNote,
        submittedAt: ms.submittedAt,
        completedAt: ms.completedAt,
        files: (ms.files ?? []).map((f: any) => f.url),
      })),
    };
  }

  // ─── GET /contracts ──────────────────────────────────────────────────────────

  async getMyContracts(userId: string) {
    const contracts = await this.prisma.contract.findMany({
      where: {
        OR: [{ clientId: userId }, { freelancerId: userId }],
      },
      include: {
        milestones: { include: { files: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return contracts.map((c) => this.formatContractDetail(c));
  }

  // ─── GET /contracts/:id ──────────────────────────────────────────────────────

  async getContractById(userId: string, contractId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { milestones: { include: { files: true } } },
    });

    if (!contract) throw new NotFoundException('Hợp đồng không tồn tại');

    // Only client or freelancer of this contract can view
    if (contract.clientId !== userId && contract.freelancerId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem hợp đồng này');
    }

    return this.formatContractDetail(contract);
  }

  // ─── POST /contracts ─────────────────────────────────────────────────────────

  async createContract(userId: string, userRole: string, dto: CreateContractDto) {
    if (!dto.milestones || dto.milestones.length === 0) {
      throw new BadRequestException('Hợp đồng phải có ít nhất 1 milestone');
    }

    const totalValue = dto.milestones.reduce((sum, ms) => sum + ms.budget, 0);

    let freelancerId = userId;
    let clientId = userId;

    if (userRole.toLowerCase() === 'freelancer') {
      const mockClient = await this.prisma.user.findFirst({
        where: { role: Role.CLIENT },
      });
      clientId = mockClient ? mockClient.id : userId;
    } else {
      const mockFreelancer = await this.prisma.user.findFirst({
        where: { role: Role.FREELANCER },
      });
      freelancerId = mockFreelancer ? mockFreelancer.id : userId;
    }

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
        milestones: {
          create: dto.milestones.map((ms) => ({
            name: ms.name,
            budget: ms.budget,
            deadline: ms.deadline,
          })),
        },
      },
      include: { milestones: { include: { files: true } } },
    });

    return this.formatContractDetail(contract);
  }

  // ─── POST /contracts/:id/fund/build ───────────────────────────────────────────

  async buildFundEscrowTx(userId: string, contractId: string, clientWalletAddress: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { client: true, freelancer: true, milestones: true },
    });

    if (!contract) throw new NotFoundException('Hợp đồng không tồn tại');
    if (contract.clientId !== userId) {
      throw new ForbiddenException('Chỉ Client mới có thể nạp tiền cho hợp đồng');
    }
    if (contract.status !== ContractStatus.DRAFT) {
      throw new BadRequestException(`Hợp đồng đang ở trạng thái ${contract.status}`);
    }

    // Save client wallet address
    await this.prisma.user.update({
      where: { id: userId },
      data: { walletAddress: clientWalletAddress },
    });

    // 1. Get PKHs
    const clientPkh = resolvePaymentKeyHash(clientWalletAddress);
    
    // For freelancer, we either get from their profile or if not set, use a dummy or require them to set it.
    // Assuming for MVP they have set it or we mock it. We can require freelancer to have walletAddress.
    // If null, we mock a PKH for demonstration to avoid blocking
    let freelancerPkh = contract.freelancer.walletPkh;
    if (!freelancerPkh) {
      // Mocking freelancer PKH if missing
      freelancerPkh = 'dummy_freelancer_pkh_1234567890123456789012345678901234567890';
    }

    // 2. Council PKHs (must match seed-admins.ts)
    const councilUsers = await this.prisma.user.findMany({ where: { isAdmin: true } });
    if (councilUsers.length < 3) {
      throw new Error('Hệ thống thiếu Admin Council, vui lòng chạy seed-admins.ts');
    }
    const councilPkhs = councilUsers.map(u => u.walletPkh || '').filter(p => p !== '');
    const threshold = 2; // 2/3 multisig

    // 3. Amount Lovelace
    const amountLovelace = Math.floor(Number(contract.totalValue) * 1000000).toString();

    // 4. Build Tx
    let buildResult;
    try {
      buildResult = await this.fundEscrowTxBuilder.buildFundEscrowTx(
        clientPkh,
        freelancerPkh,
        councilPkhs,
        threshold,
        amountLovelace,
        clientWalletAddress
      );
    } catch (error: any) {
      console.error('Build Tx Error:', error);
      if (error?.message?.includes('UTxO Balance Insufficient')) {
        throw new BadRequestException('Ví của bạn không có đủ UTxO hoặc ADA trên mạng Preprod để thực hiện giao dịch.');
      }
      if (error?.response?.status === 403) {
        throw new BadRequestException('Lỗi Blockfrost: API Key không hợp lệ hoặc hết hạn.');
      }
      throw new BadRequestException('Lỗi tạo giao dịch: ' + (error.message || 'Blockfrost trả về lỗi'));
    }

    const { unsignedTxCbor, datumJson, scriptAddress } = buildResult;

    // Save datum temporally in contract so we can use it later
    await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        escrowScriptAddress: scriptAddress,
        escrowDatumCbor: datumJson
      }
    });

    return { unsignedTxCbor };
  }

  // ─── POST /contracts/:id/fund/submit ──────────────────────────────────────────

  async submitFundEscrowTx(userId: string, contractId: string, signedTxCbor: string) {
    const txHash = await this.blockfrostProvider.submitTx(signedTxCbor);
    
    // Asynchronously poll for confirmation
    this.confirmEscrowFunded(contractId, txHash).catch(console.error);

    return { txHash };
  }

  // ─── Background Polling ────────────────────────────────────────────────────────

  private async confirmEscrowFunded(contractId: string, txHash: string) {
    let confirmed = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 * 10s = 5 minutes
    
    while (!confirmed && attempts < maxAttempts) {
      try {
        const txInfo = await this.blockfrostProvider.fetchTxInfo(txHash);
        if (txInfo) {
          confirmed = true;
          
          // Tx is confirmed. Find the output index matching the script address
          const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
          const scriptAddress = contract?.escrowScriptAddress;
          
          let outputIndex = 0; // Default to 0, ideally we should match scriptAddress if multiple outputs
          // We don't have a direct fetchTxOutputs in Mesh's BlockfrostProvider easily accessible without custom REST call
          // But since the tx builder puts the script output first typically, index 0 is very likely it.
          // Or we query the script address UTXOs
          
          // Give it a brief moment for UTXOs to index properly in blockfrost
          await new Promise(r => setTimeout(r, 5000));
          
          const scriptUtxos = await this.blockfrostProvider.fetchAddressUTxOs(scriptAddress!);
          const matchingUtxo = scriptUtxos.find(u => u.input.txHash === txHash);
          
          if (matchingUtxo) {
            outputIndex = matchingUtxo.input.outputIndex;
          }

          const firstMilestone = await this.prisma.milestone.findFirst({
            where: { contractId },
            orderBy: { createdAt: 'asc' }
          });

          // Update Contract status
          await this.prisma.$transaction(async (tx) => {
            await tx.contract.update({
              where: { id: contractId },
              data: {
                status: ContractStatus.ACTIVE,
                escrowedAmount: contract!.totalValue,
                startDate: new Date().toISOString().split('T')[0],
                escrowTxHash: txHash,
                escrowOutputIndex: outputIndex,
              },
            });

            if (firstMilestone) {
              await tx.milestone.update({
                where: { id: firstMilestone.id },
                data: { status: MilestoneStatus.ACTIVE },
              });
            }

            await tx.message.create({
              data: {
                contractId,
                senderId: contract!.clientId,
                senderName: 'Hệ thống',
                type: MessageType.SYSTEM,
                text: `✅ Giao dịch nạp tiền đã xác nhận trên chuỗi khối Cardano (TxHash: ${txHash}). Hợp đồng chính thức bắt đầu!`,
              },
            });
          });

          await this.notificationsService.create(
            contract!.freelancerId,
            NotificationType.CONTRACT_SIGNED,
            'Hợp đồng đã bắt đầu!',
            `Client đã nạp ADA vào Escrow (TxHash: ${txHash}). Hãy bắt đầu làm việc!`,
            { contractId },
          );
          return;
        }
      } catch (e) {
        // Blockfrost usually returns 404 if tx not found yet
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 10000)); // wait 10s
    }
    
    console.error(`Tx ${txHash} for contract ${contractId} was not confirmed within time limit.`);
  }
}
