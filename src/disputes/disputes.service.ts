import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DisputeTxBuilder } from './dispute-tx.builder';

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txBuilder: DisputeTxBuilder,
  ) {}

  async getDispute(id: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: { votes: true },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');
    return dispute;
  }

  async openDispute(contractId: string, userId: string, reason: string, signerAddress: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contract not found');
    
    if (!contract.escrowTxHash || !contract.escrowDatumCbor || !contract.escrowScriptAddress) {
      throw new BadRequestException('Contract is missing on-chain escrow information');
    }

    const dispute = await this.prisma.dispute.create({
      data: {
        contractId,
        openedById: userId,
        reason,
        status: 'OPEN',
      },
    });

    await this.prisma.contract.update({
      where: { id: contractId },
      data: { status: 'DISPUTED' },
    });

    const escrowLovelace = Math.floor(Number(contract.totalValue) * 1000000).toString();
    const utxo = {
      input: { txHash: contract.escrowTxHash, outputIndex: contract.escrowOutputIndex },
      output: { 
        amount: [{ unit: 'lovelace', quantity: escrowLovelace }], 
        address: contract.escrowScriptAddress 
      }
    };

    const oldDatum = JSON.parse(contract.escrowDatumCbor);
    const newDatum = {
      alternative: 0,
      fields: [
        oldDatum.fields[0],
        oldDatum.fields[1],
        oldDatum.fields[2],
        oldDatum.fields[3],
        oldDatum.fields[4],
        { alternative: 1, fields: [] } // state = Disputed
      ]
    };

    // Update datum in DB since it will change after open dispute
    // Wait, the tx needs to be submitted first. We shouldn't update DB yet.
    // However, the FE will submit the tx.

    const unsignedTxCbor = await this.txBuilder.buildOpenDisputeTx(
      utxo, 
      newDatum, 
      signerAddress, 
      contract.escrowScriptAddress
    );

    return { dispute, unsignedTxCbor };
  }

  async vote(disputeId: string, adminId: string, choice: any, comment?: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { contract: { include: { client: true, freelancer: true } } }
    });
    if (!dispute) throw new NotFoundException('Dispute not found');
    
    const contract = dispute.contract;
    if (!contract.escrowTxHash || !contract.escrowScriptAddress) {
      throw new BadRequestException('Contract missing on-chain info');
    }

    const vote = await this.prisma.disputeVote.upsert({
      where: { disputeId_adminId: { disputeId, adminId } },
      update: { choice, comment },
      create: { disputeId, adminId, choice, comment },
    });
    
    const outcomeIndex = choice === 'CLIENT' ? 0 : choice === 'FREELANCER' ? 1 : 2;
    
    const escrowLovelace = Math.floor(Number(contract.totalValue) * 1000000).toString();
    const utxo = {
      input: { txHash: contract.escrowTxHash, outputIndex: contract.escrowOutputIndex },
      output: { 
        amount: [{ unit: 'lovelace', quantity: escrowLovelace }], 
        address: contract.escrowScriptAddress 
      }
    };
    
    const admins = await this.prisma.user.findMany({ where: { isAdmin: true } });
    const voterPkhs = admins.map(a => a.walletPkh).filter(Boolean) as string[];

    let payouts = [];
    if (choice === 'CLIENT') {
      payouts = [{ address: contract.client.walletAddress || '', amount: escrowLovelace }];
    } else if (choice === 'FREELANCER') {
      payouts = [{ address: contract.freelancer.walletAddress || '', amount: escrowLovelace }];
    } else {
      const half = Math.floor(Number(escrowLovelace) / 2).toString();
      payouts = [
        { address: contract.client.walletAddress || '', amount: half },
        { address: contract.freelancer.walletAddress || '', amount: half }
      ];
    }

    const unsignedTxCbor = await this.txBuilder.assembleAndSubmitResolveDispute(
      utxo,
      { voterPkhs, outcomeIndex, payouts },
      [], // Building unsigned tx
      contract.escrowScriptAddress
    );

    return {
      voteId: vote.id,
      unsignedTxCbor,
    };
  }

  async submitPartialSig(disputeId: string, voteId: string, partialSigCbor: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { contract: { include: { client: true, freelancer: true } } }
    });
    if (!dispute) throw new NotFoundException('Dispute not found');
    const contract = dispute.contract;

    const vote = await this.prisma.disputeVote.update({
      where: { id: voteId },
      data: { partialSigCbor },
    });

    const allVotes = await this.prisma.disputeVote.findMany({
      where: { disputeId, choice: vote.choice, partialSigCbor: { not: null } }
    });

    const threshold = 2; // Usually parsed from datum, hardcoded here for simplicity

    if (allVotes.length >= threshold) {
      const outcomeIndex = vote.choice === 'CLIENT' ? 0 : vote.choice === 'FREELANCER' ? 1 : 2;
      const escrowLovelace = Math.floor(Number(contract.totalValue) * 1000000).toString();
      const utxo = {
        input: { txHash: contract.escrowTxHash, outputIndex: contract.escrowOutputIndex },
        output: { 
          amount: [{ unit: 'lovelace', quantity: escrowLovelace }], 
          address: contract.escrowScriptAddress! 
        }
      };

      const admins = await this.prisma.user.findMany({ where: { isAdmin: true } });
      const voterPkhs = admins.map(a => a.walletPkh).filter(Boolean) as string[];

      let payouts = [];
      if (vote.choice === 'CLIENT') {
        payouts = [{ address: contract.client.walletAddress || '', amount: escrowLovelace }];
      } else if (vote.choice === 'FREELANCER') {
        payouts = [{ address: contract.freelancer.walletAddress || '', amount: escrowLovelace }];
      } else {
        const half = Math.floor(Number(escrowLovelace) / 2).toString();
        payouts = [
          { address: contract.client.walletAddress || '', amount: half },
          { address: contract.freelancer.walletAddress || '', amount: half }
        ];
      }

      const sigs = allVotes.map(v => v.partialSigCbor as string);

      try {
        const txHash = await this.txBuilder.assembleAndSubmitResolveDispute(
          utxo,
          { voterPkhs, outcomeIndex, payouts },
          sigs,
          contract.escrowScriptAddress!
        );

        await this.prisma.dispute.update({
          where: { id: disputeId },
          data: { status: 'RESOLVED', onChainTxHash: txHash, resolvedAt: new Date() }
        });
        
        await this.prisma.contract.update({
          where: { id: contract.id },
          data: { status: 'COMPLETED' } // Mark completed after dispute resolution
        });

        return { success: true, txHash, resolved: true };
      } catch (e: any) {
        throw new BadRequestException('Failed to submit resolved tx: ' + e.message);
      }
    }

    return { success: true, resolved: false, message: 'Vote recorded. Waiting for more signatures.' };
  }
}
