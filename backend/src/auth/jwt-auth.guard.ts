import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtStrategy } from './jwt.strategy'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtStrategy: JwtStrategy) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()
    const authHeader: string | undefined = req.headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token manquant')
    }
    const token = authHeader.slice('Bearer '.length)
    const payload = this.jwtStrategy.verify(token)
    req.user = payload
    return true
  }
}
