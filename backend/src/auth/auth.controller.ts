import { Body, Controller, Post } from '@nestjs/common'
import { IsEmail, IsString, MinLength } from 'class-validator'
import { AuthService } from './auth.service'

class RegisterDto {
  @IsEmail() email: string
  @IsString() @MinLength(2) name: string
  @IsString() @MinLength(6) password: string
}
class LoginDto {
  @IsEmail() email: string
  @IsString() password: string
}
class ForgotPasswordDto {
  @IsEmail() email: string
}
class ResetPasswordDto {
  @IsString() token: string
  @IsString() @MinLength(6) password: string
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.name, dto.password)
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password)
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email)
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password)
  }
}
