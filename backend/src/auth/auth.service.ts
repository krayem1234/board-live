import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as crypto from 'crypto'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma.service'
import { MailService } from '../mail/mail.service'

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService, private mail: MailService) {}

  async register(email: string, name: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing) throw new ConflictException('Un compte existe déjà avec cet email')
    const hash = await bcrypt.hash(password, 10)
    const user = await this.prisma.user.create({ data: { email, name, password: hash } })
    return this.signToken(user.id, user.email, user.name)
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) throw new UnauthorizedException('Identifiants invalides')
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) throw new UnauthorizedException('Identifiants invalides')
    return this.signToken(user.id, user.email, user.name)
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })
    // On répond toujours pareil, qu'un compte existe ou non, pour ne pas révéler qui a un compte.
    if (!user) return { ok: true }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1h
    await this.prisma.passwordResetToken.create({ data: { token, userId: user.id, expiresAt } })

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const link = `${frontendUrl}/reset-password?token=${token}`
    await this.mail.sendPasswordReset(email, link)
    return { ok: true }
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { token } })
    if (!record || record.used || record.expiresAt < new Date()) {
      throw new BadRequestException('Ce lien de réinitialisation est invalide ou a expiré')
    }
    const hash = await bcrypt.hash(newPassword, 10)
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { password: hash } }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
    ])
    return { ok: true }
  }

  private signToken(sub: string, email: string, name: string) {
    const token = this.jwt.sign({ sub, email })
    return { token, user: { id: sub, email, name } }
  }
}
