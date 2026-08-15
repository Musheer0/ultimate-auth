import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreatePasswordUserDto } from './dtos/register-user.dto';
import { VerificationTokenDto } from './dtos/verification-token.dto';
import {UAParser} from 'ua-parser-js';
import { LoginUserDto } from './dtos/login-user.dto';
import {
  RequestPasswordResetDto,
  ResetPasswordDto,
} from './dtos/change-password.dto';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  async signUp(@Body() body: CreatePasswordUserDto) {
    return this.authService.registerPasswordUser(body);
  }
  @Post('verify-email')
  async verifyEmail(@Body() body: VerificationTokenDto) {
    return this.authService.verifyPasswordUserEmail(body);
  }
@Post("sign-in")
async signIn(
  @Body() body: LoginUserDto,
  @Req() req: Request,
) {
  const ua = UAParser(req.headers["user-agent"]);

  const ip =
    req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
    req["socket"]?.remoteAddress ||
    "0.0.0.0";

  return this.authService.loginUser(
    body,
    JSON.stringify(ua),
    ip,
  );
}

  @Post('reset-password')
  async requestPasswordReset(@Body() body: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('reset-password/:id')
  async resetPassword(@Param('id') id: string, @Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(id, body);
  }
}
