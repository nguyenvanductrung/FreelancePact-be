import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { DisputesService } from './disputes.service';

@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Get(':id')
  async getDispute(@Param('id') id: string) {
    return this.disputesService.getDispute(id);
  }

  @Post(':id/vote')
  async castVote(
    @Param('id') id: string,
    @Body() body: { choice: any; comment?: string },
    @Request() req: any,
  ) {
    // In a real app, extract adminId from req.user
    const adminId = req.user?.id || 'dummy_admin_id';
    return this.disputesService.vote(id, adminId, body.choice, body.comment);
  }

  @Post(':id/partial-sig')
  async submitPartialSig(
    @Param('id') id: string,
    @Body() body: { voteId: string; partialSigCbor: string },
  ) {
    return this.disputesService.submitPartialSig(id, body.voteId, body.partialSigCbor);
  }
}

// In a real app, this route would be in ContractsController
@Controller('contracts')
export class ContractsDisputeController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post(':id/dispute')
  async openDispute(
    @Param('id') id: string,
    @Body() body: { reason: string; signerAddress: string },
    @Request() req: any,
  ) {
    const userId = req.user?.id || 'dummy_user_id';
    return this.disputesService.openDispute(id, userId, body.reason, body.signerAddress);
  }
}
