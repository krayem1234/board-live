import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class JwtStrategy {
  constructor(private jwt: JwtService) {}

  verify(token: string): { sub: string; email: string } {
    try {
      return this.jwt.verify(token)
    } catch {
      throw new UnauthorizedException('Token invalide')
    }
  }
}
