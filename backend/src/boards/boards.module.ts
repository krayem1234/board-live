import { Module } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { AuthModule } from '../auth/auth.module'
import { MailModule } from '../mail/mail.module'
import { BoardsController } from './boards.controller'
import { BoardsService } from './boards.service'
import { BoardsGateway } from './boards.gateway'

@Module({
  imports: [AuthModule, MailModule],
  controllers: [BoardsController],
  providers: [BoardsService, PrismaService, BoardsGateway],
})
export class BoardsModule {}
