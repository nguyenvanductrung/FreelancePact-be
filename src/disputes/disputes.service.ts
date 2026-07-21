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

    // Dummy values for UTXO and newDatum to pass to txBuilder for now
    // In reality, we'd query blockfrost for the script UTXO
    const dummyUtxo = { input: { txHash: '...', outputIndex: 0 }, output: { amount: [], address: '...' } };
    const dummyDatum = { /* construct new datum with state=Disputed */ };
    const scriptAddress = 'addr_test1...';

    // Build the unsigned tx
    const unsignedTxCbor = await this.txBuilder.buildOpenDisputeTx(dummyUtxo, dummyDatum, signerAddress, scriptAddress);

    return { dispute, unsignedTxCbor };
  }

  async vote(disputeId: string, adminId: string, choice: any, comment?: string) {
    const vote = await this.prisma.disputeVote.upsert({
      where: { disputeId_adminId: { disputeId, adminId } },
      update: { choice, comment },
      create: { disputeId, adminId, choice, comment },
    });
    
    // Build unsigned tx for this specific outcome choice
    const outcomeIndex = choice === 'CLIENT' ? 0 : choice === 'FREELANCER' ? 1 : 2;
    // In reality, we fetch all these from Blockfrost and DB
    const dummyUtxo = { input: { txHash: '...', outputIndex: 0 }, output: { amount: [], address: '...' } };
    
    // We need all admin PKHs for the redeemer list
    const admins = await this.prisma.user.findMany({ where: { isAdmin: true } });
    const voterPkhs = admins.map(a => a.walletPkh).filter(Boolean) as string[];

    // Define payouts based on choice and contract escrow value
    const payouts = [{ address: 'dummy_winner_addr', amount: '10000000' }]; // TODO: fetch from contract

    const unsignedTxCbor = await this.txBuilder.assembleAndSubmitResolveDispute(
      dummyUtxo,
      { voterPkhs, outcomeIndex, payouts },
      [], // No partial sigs yet, just building unsigned tx
      'dummy_script_addr'
    );

    return {
      voteId: vote.id,
      unsignedTxCbor,
    };
  }

  async submitPartialSig(disputeId: string, voteId: string, partialSigCbor: string) {
    const vote = await this.prisma.disputeVote.update({
      where: { id: voteId },
      data: { partialSigCbor },
    });

    // Check if threshold reached (e.g. 2 votes for the SAME choice)
    const allVotes = await this.prisma.disputeVote.findMany({
      where: { disputeId, choice: vote.choice, partialSigCbor: { not: null } }
    });

    const threshold = 2; // In reality, get from contract datum

    if (allVotes.length >= threshold) {
      // We have enough signatures! Submit the tx
      const outcomeIndex = vote.choice === 'CLIENT' ? 0 : vote.choice === 'FREELANCER' ? 1 : 2;
      const dummyUtxo = { input: { txHash: '...', outputIndex: 0 }, output: { amount: [], address: '...' } };
      const admins = await this.prisma.user.findMany({ where: { isAdmin: true } });
      const voterPkhs = admins.map(a => a.walletPkh).filter(Boolean) as string[];
      const payouts = [{ address: 'dummy_winner_addr', amount: '10000000' }];
      const sigs = allVotes.map(v => v.partialSigCbor as string);

      try {
        const txHash = await this.txBuilder.assembleAndSubmitResolveDispute(
          dummyUtxo,
          { voterPkhs, outcomeIndex, payouts },
          sigs,
          'dummy_script_addr'
        );

        // Update dispute status
        await this.prisma.dispute.update({
          where: { id: disputeId },
          data: { status: 'RESOLVED', onChainTxHash: txHash, resolvedAt: new Date() }
        });

        return { success: true, txHash, resolved: true };
      } catch (e: any) {
        throw new BadRequestException('Failed to submit resolved tx: ' + e.message);
      }
    }

    return { success: true, resolved: false, message: 'Vote recorded. Waiting for more signatures.' };
  }
}
