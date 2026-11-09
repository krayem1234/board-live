import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger } from '@nestjs/common'
import { JwtStrategy } from '../auth/jwt.strategy'
import { PrismaService } from '../prisma.service'

type Presence = { socketId: string; userId: string; name: string }

@WebSocketGateway({ cors: { origin: '*' } })
export class BoardsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server
  private logger = new Logger('BoardsGateway')
  // boardId -> list of present users
  private presence = new Map<string, Presence[]>()

  constructor(private jwtStrategy: JwtStrategy, private prisma: PrismaService) {}

  handleConnection(socket: Socket) {
    try {
      const token = socket.handshake.auth?.token as string
      const payload = this.jwtStrategy.verify(token)
      socket.data.userId = payload.sub
      socket.data.email = payload.email
    } catch {
      socket.disconnect(true)
    }
  }

  handleDisconnect(socket: Socket) {
    for (const [boardId, users] of this.presence.entries()) {
      const next = users.filter((u) => u.socketId !== socket.id)
      if (next.length !== users.length) {
        this.presence.set(boardId, next)
        this.server.to(room(boardId)).emit('presence:update', next)
      }
    }
  }

  private async assertMember(userId: string, boardId: string) {
    const member = await this.prisma.boardMember.findUnique({ where: { boardId_userId: { boardId, userId } } })
    if (!member) throw new Error('forbidden')
    return member
  }

  // Lets other members of a board know someone was removed/the board was deleted, from outside a socket handler.
  broadcastMemberRemoved(boardId: string, userId: string) {
    this.server.to(room(boardId)).emit('member:removed', { userId })
  }

  broadcastBoardDeleted(boardId: string) {
    this.server.to(room(boardId)).emit('board:deleted', { boardId })
  }

  broadcastBoardRenamed(boardId: string, title: string) {
    this.server.to(room(boardId)).emit('board:renamed', { title })
  }

  @SubscribeMessage('board:join')
  async onJoin(@ConnectedSocket() socket: Socket, @MessageBody() data: { boardId: string; name: string }) {
    const { boardId, name } = data
    try {
      await this.assertMember(socket.data.userId, boardId)
    } catch {
      return
    }
    socket.join(room(boardId))
    const users = this.presence.get(boardId) ?? []
    users.push({ socketId: socket.id, userId: socket.data.userId, name })
    this.presence.set(boardId, users)
    this.server.to(room(boardId)).emit('presence:update', users)
  }

  @SubscribeMessage('board:leave')
  onLeave(@ConnectedSocket() socket: Socket, @MessageBody() data: { boardId: string }) {
    socket.leave(room(data.boardId))
    const users = (this.presence.get(data.boardId) ?? []).filter((u) => u.socketId !== socket.id)
    this.presence.set(data.boardId, users)
    this.server.to(room(data.boardId)).emit('presence:update', users)
  }

  @SubscribeMessage('cursor:move')
  onCursor(@ConnectedSocket() socket: Socket, @MessageBody() data: { boardId: string; name: string; x: number; y: number }) {
    socket.to(room(data.boardId)).emit('cursor:move', { userId: socket.data.userId, name: data.name, x: data.x, y: data.y })
  }

  @SubscribeMessage('list:create')
  async onListCreate(@ConnectedSocket() socket: Socket, @MessageBody() data: { boardId: string; title: string }) {
    await this.assertMember(socket.data.userId, data.boardId)
    const count = await this.prisma.list.count({ where: { boardId: data.boardId } })
    const list = await this.prisma.list.create({
      data: { title: data.title, position: count, boardId: data.boardId },
      include: { cards: true },
    })
    this.server.to(room(data.boardId)).emit('list:created', list)
  }

  @SubscribeMessage('list:rename')
  async onListRename(@ConnectedSocket() socket: Socket, @MessageBody() data: { boardId: string; listId: string; title: string }) {
    await this.assertMember(socket.data.userId, data.boardId)
    await this.prisma.list.update({ where: { id: data.listId }, data: { title: data.title } })
    this.server.to(room(data.boardId)).emit('list:renamed', { listId: data.listId, title: data.title })
  }

  @SubscribeMessage('list:delete')
  async onListDelete(@ConnectedSocket() socket: Socket, @MessageBody() data: { boardId: string; listId: string }) {
    await this.assertMember(socket.data.userId, data.boardId)
    await this.prisma.list.delete({ where: { id: data.listId } })
    this.server.to(room(data.boardId)).emit('list:deleted', { listId: data.listId })
  }

  @SubscribeMessage('list:reorder')
  async onListReorder(@ConnectedSocket() socket: Socket, @MessageBody() data: { boardId: string; orderedListIds: string[] }) {
    await this.assertMember(socket.data.userId, data.boardId)
    await this.prisma.$transaction(
      data.orderedListIds.map((listId, position) =>
        this.prisma.list.update({ where: { id: listId }, data: { position } }),
      ),
    )
    this.server.to(room(data.boardId)).emit('list:reordered', { orderedListIds: data.orderedListIds })
  }

  @SubscribeMessage('card:create')
  async onCardCreate(@ConnectedSocket() socket: Socket, @MessageBody() data: { boardId: string; listId: string; title: string }) {
    await this.assertMember(socket.data.userId, data.boardId)
    const count = await this.prisma.card.count({ where: { listId: data.listId } })
    const card = await this.prisma.card.create({
      data: { title: data.title, position: count, listId: data.listId },
      include: { assignee: { select: { id: true, name: true } } },
    })
    this.server.to(room(data.boardId)).emit('card:created', { listId: data.listId, card })
  }

  @SubscribeMessage('card:move')
  async onCardMove(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { boardId: string; cardId: string; toListId: string; toPosition: number },
  ) {
    await this.assertMember(socket.data.userId, data.boardId)
    const card = await this.prisma.card.update({
      where: { id: data.cardId },
      data: { listId: data.toListId, position: data.toPosition },
    })
    this.server.to(room(data.boardId)).emit('card:moved', {
      cardId: data.cardId,
      toListId: data.toListId,
      toPosition: data.toPosition,
    })
    return card
  }

  @SubscribeMessage('card:update')
  async onCardUpdate(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    data: {
      boardId: string
      cardId: string
      title?: string
      description?: string
      dueDate?: string | null
      assigneeId?: string | null
    },
  ) {
    await this.assertMember(socket.data.userId, data.boardId)
    const card = await this.prisma.card.update({
      where: { id: data.cardId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
        ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId } : {}),
      },
      include: { assignee: { select: { id: true, name: true } } },
    })
    this.server.to(room(data.boardId)).emit('card:updated', card)
  }

  @SubscribeMessage('card:delete')
  async onCardDelete(@ConnectedSocket() socket: Socket, @MessageBody() data: { boardId: string; cardId: string; listId: string }) {
    await this.assertMember(socket.data.userId, data.boardId)
    await this.prisma.card.delete({ where: { id: data.cardId } })
    this.server.to(room(data.boardId)).emit('card:deleted', { cardId: data.cardId, listId: data.listId })
  }
}

function room(boardId: string) {
  return `board:${boardId}`
}
