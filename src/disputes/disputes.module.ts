import { Module } from '@nestjs/common';
import { DisputesController, ContractsDisputeController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { DisputeTxBuilder } from './dispute-tx.builder';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DisputesController, ContractsDisputeController],
  providers: [DisputesService, DisputeTxBuilder],
  exports: [DisputesService],
})
export class DisputesModule {}
