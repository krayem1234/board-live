import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { MailService } from '../mail/mail.service'
import { BoardsGateway } from './boards.gateway'

@Injectable()
export class BoardsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private gateway: BoardsGateway,
  ) {}

  async myBoards(userId: string) {
    return this.prisma.board.findMany({
      where: { members: { some: { userId } } },
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createBoard(userId: string, title: string) {
    return this.prisma.board.create({
      data: {
        title,
        members: { create: { userId, role: 'owner' } },
        lists: {
          create: [
            { title: 'À faire', position: 0 },
            { title: 'En cours', position: 1 },
            { title: 'Terminé', position: 2 },
          ],
        },
      },
      include: { lists: { include: { cards: true } }, members: true },
    })
  }

  async getBoard(userId: string, boardId: string) {
    await this.assertMember(userId, boardId)
    return this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        lists: {
          orderBy: { position: 'asc' },
          include: {
            cards: {
              orderBy: { position: 'asc' },
              include: { assignee: { select: { id: true, name: true } } },
            },
          },
        },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    })
  }

  async renameBoard(userId: string, boardId: string, title: string) {
    await this.assertMember(userId, boardId)
    const board = await this.prisma.board.update({ where: { id: boardId }, data: { title } })
    this.gateway.broadcastBoardRenamed(boardId, title)
    return board
  }

  async addMember(userId: string, boardId: string, email: string) {
    await this.assertMember(userId, boardId)
    const board = await this.prisma.board.findUnique({ where: { id: boardId } })
    const inviter = await this.prisma.user.findUnique({ where: { id: userId } })
    const inviterName = inviter?.name || "Quelqu'un"
    const boardTitle = board?.title || 'un tableau'

    const user = await this.prisma.user.findUnique({ where: { email } })

    if (!user) {
      // Pas de compte avec cet email : on garde une invitation en attente, appliquée
      // automatiquement si cette personne crée un compte avec cet email plus tard.
      await this.prisma.boardInvite.upsert({
        where: { boardId_email: { boardId, email } },
        update: {},
        create: { boardId, email, role: 'member' },
      })
      await this.mail.sendBoardInvite(email, boardTitle, inviterName, false)
      return { invited: true, accountExists: false, email }
    }

    const existing = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: user.id } },
    })

    const member = await this.prisma.boardMember.upsert({
      where: { boardId_userId: { boardId, userId: user.id } },
      update: {},
      create: { boardId, userId: user.id, role: 'member' },
      include: { user: { select: { id: true, name: true, email: true } } },
    })
    if (!existing) await this.mail.sendBoardInvite(email, boardTitle, inviterName, true)
    return member
  }

  async removeMember(userId: string, boardId: string, targetUserId: string) {
    const me = await this.assertMember(userId, boardId)
    if (userId !== targetUserId && me.role !== 'owner') {
      throw new ForbiddenException("Seul le propriétaire du tableau peut retirer un membre")
    }
    const target = await this.prisma.boardMember.findUnique({ where: { boardId_userId: { boardId, userId: targetUserId } } })
    if (!target) throw new NotFoundException('Ce membre ne fait pas partie du tableau')
    if (target.role === 'owner') {
      throw new ForbiddenException("Le propriétaire ne peut pas être retiré du tableau")
    }
    await this.prisma.boardMember.delete({ where: { boardId_userId: { boardId, userId: targetUserId } } })
    this.gateway.broadcastMemberRemoved(boardId, targetUserId)
    return { ok: true }
  }

  async deleteBoard(userId: string, boardId: string) {
    const me = await this.assertMember(userId, boardId)
    if (me.role !== 'owner') throw new ForbiddenException('Seul le propriétaire peut supprimer ce tableau')
    this.gateway.broadcastBoardDeleted(boardId)
    await this.prisma.board.delete({ where: { id: boardId } })
    return { ok: true }
  }

  async assertMember(userId: string, boardId: string) {
    const member = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
    })
    if (!member) throw new ForbiddenException("Tu n'as pas accès à ce tableau")
    return member
  }
}
