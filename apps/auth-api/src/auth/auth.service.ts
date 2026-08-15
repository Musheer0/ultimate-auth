import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { CreatePasswordUserDto } from './dtos/register-user.dto';
import { hash, verify } from 'argon2';
import {
  getVerificationTokenExpiry,
  verification_token_expires,
} from '../constants/verification_token';
import {
  account_provider,
  user,
  verification_token,
  verification_token_type,
} from '../generated/prisma/client';
import { generate } from 'otp-generator';
import { VerificationTokenDto } from './dtos/verification-token.dto';
import { LoginUserDto } from './dtos/login-user.dto';
import { getSessionExpiry } from '../constants/session';
import { ResetPasswordDto } from './dtos/change-password.dto';

@Injectable()
export class AuthService {
  constructor(private db: DbService) {}

  async getUserById(userId: string) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    return user;
  }
  async getUserByEmail(email: string) {
    const user = await this.db.user.findUnique({ where: { email } });
    return user;
  }
  async hash(secret: string) {
    return hash(secret);
  }

  async verify(data: { secret: string; hashed: string }) {
    return verify(data.hashed, data.secret);
  }
  private async saveNewUser(data: CreatePasswordUserDto) {
    return this.db.user.create({
      data,
    });
  }
  private async createVerificationToken(
    userId: string,
    type: verification_token_type = 'EMAIL_VERIFICATION',
  ) {
    const otp = generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });
    const hashedOtp = await this.hash(otp);
    const verification_token = await this.db.verification_token.create({
      data: {
        user_id: userId,
        type: type,
        expires_at: getVerificationTokenExpiry(type),
        code: hashedOtp,
      },
    });
    return {
      otp,
      verification_token,
    };
  }
  private async sendEmail({
    otp: string,
    verification_token: verification_token,
  }) {
    //TODO send email
  }
  async registerPasswordUser(data: CreatePasswordUserDto) {
    try {
      const existing_user = await this.getUserByEmail(data.email);
      if (!existing_user) throw new ConflictException('users already exists');
      const hashedPassword = await this.hash(data.password);
      const new_user = await this.saveNewUser({
        ...data,
        password: hashedPassword,
      });
      const verification_token = await this.createVerificationToken(
        new_user.id,
      );
      await this.sendEmail(verification_token);
      return {
        success: true,
        message: 'verification code sent to user',
        verification_id: verification_token.verification_token.id,
        expires_at: verification_token.verification_token.expires_at,
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('error creating user');
    }
  }

  async getVerificationTokenById(id: string) {
    return this.db.verification_token.findUnique({
      where: { id, expires_at: { gt: new Date() } },
    });
  }
  private async verifyPasswordUser(userId: string) {
    const user = await this.db.user.update({
      where: {
        id: userId,
        verified_at: null,
      },
      data: {
        verified_at: new Date(),
      },
    });
    await this.db.account.create({
      data: {
        user_id: user.id,
        verified_at: new Date(),
        provider: 'PASSWORD',
      },
      select: null,
    });
    return user;
  }
  private async cacheUser(user: user) {
    //cache using redis
  }
  async verifyPasswordUserEmail(data: VerificationTokenDto) {
    const token = await this.getVerificationTokenById(data.token_id);
    if (!token) throw new NotFoundException('invalid code or token expired');
    const isValidCode = await this.verify({
      secret: data.code,
      hashed: token.code,
    });
    if (!isValidCode)
      throw new BadRequestException('invalid code or token expired');
    const user = await this.verifyPasswordUser(token.user_id);
    await this.cacheUser(user);
    return {
      success: true,
      email: user.email,
      message: 'verification successful you can now login ',
    };
  }
  private async getUserAccount(userId: string, type: account_provider) {
    return this.db.account.findFirst({
      where: {
        user_id: userId,
        provider: type,
        verified_at: { not: undefined },
      },
    });
  }
  private async createUserSession(userId: string, ua: string, ip: string) {
    const session = await this.db.session.create({
      data: {
        user_id: userId,
        ua,
        ip,
        expires_at: getSessionExpiry(),
      },
    });

    //cache token using redis

    return session;
  }
  async loginUser(data: LoginUserDto, ua: string, ip: string) {
    const user = await this.getUserByEmail(data.email);
    if (!user || !user.password) throw new NotFoundException('user not found');
    if (!user.verified_at) throw new BadRequestException('email not verified');
    const password_account = await this.getUserAccount(user.id, 'PASSWORD');
    if (!password_account) throw new NotFoundException('user not found');
    const isValidPassword = await this.verify({
      secret: data.password,
      hashed: user.password,
    });
    if (!isValidPassword) throw new NotFoundException('user not found');
    const session = await this.createUserSession(user.id, ua, ip);
    return { sessionId: session.id, expiresAt: session.expires_at };
  }
  private async createPasswordAccount(userId: string, type: account_provider) {
    return this.db.account.create({
      data: {
        user_id: userId,
        provider: type,
        verified_at: new Date(),
      },
    });
  }
  private async updateUserPassword(userId: string, new_password: string) {
    const hashed = await this.hash(new_password);
    const user = await this.db.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
  }
  async requestPasswordReset(email: string) {
    const user = await this.getUserByEmail(email);

    if (!user || !user.password) {
      throw new NotFoundException('user not found');
    }

    if (!user.verified_at) {
      throw new BadRequestException('email not verified');
    }

    const verificationToken = await this.createVerificationToken(
      user.id,
      'RESET_PASSWORD',
    );

    await this.sendEmail(verificationToken);

    return {
      success: true,
      message: 'verification code sent to user',
      verification_id: verificationToken.verification_token.id,
      expires_at: verificationToken.verification_token.expires_at,
    };
  }
  async resetPassword(tokenId: string, { code, password }: ResetPasswordDto) {
    if (!code) {
      throw new BadRequestException('missing code');
    }

    const verificationToken = await this.getVerificationTokenById(tokenId);

    if (!verificationToken) {
      throw new BadRequestException('token not found or expired');
    }

    const isValidCode = await this.verify({
      secret: code,
      hashed: verificationToken.code,
    });

    if (!isValidCode) {
      throw new BadRequestException('token not found or expired');
    }

    await this.updateUserPassword(verificationToken.user_id, password);

    return {
      success: true,
      message:
        'password changed successfully please login with your new password',
    };
  }
}
