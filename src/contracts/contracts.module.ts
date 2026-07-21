import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { FundEscrowTxBuilder } from './fund-escrow-tx.builder';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [ContractsController],
  providers: [ContractsService, FundEscrowTxBuilder],
})
export class ContractsModule {}
