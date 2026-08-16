import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
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
  Prisma,
  session,
  user,
  verification_token,
  verification_token_type,
} from '../generated/prisma/client';
import { generate } from 'otp-generator';
import { VerificationTokenDto } from './dtos/verification-token.dto';
import { LoginUserDto } from './dtos/login-user.dto';
import { getSessionExpiry } from '../constants/session';
import { ResetPasswordDto } from './dtos/change-password.dto';
import { RedisService } from '../redis/redis.service';
import { RedisKeys } from '../constants/redis-key';
import { RedisExpiry } from '../constants/redis-expiry';
import { AUTH_EVENTS } from '../constants/events';
import { EventEmitter2 } from '@nestjs/event-emitter';
type SessionWithUser = Prisma.sessionGetPayload<{
  include: {
    user: {
      select: {
        email: true;
        name: true;
        image: true;
        id: true;
        verified_at: true;
      };
    };
  };
}>;
@Injectable()
export class AuthService {
  constructor(
    private db: DbService,
    private redis: RedisService,
    private readonly emitter:EventEmitter2
  ) {}
  //internal helpers
  private async getUserById(userId: string) {
    const cache = await this.redis.get<user>(RedisKeys.getUserById(userId));
    if (cache) return cache;
    const user = await this.db.user.findUnique({ where: { id: userId } });
    await this.redis.set(RedisKeys.getUserById(userId), user, {
      ex: RedisExpiry.USER,
    });
    return user;
  }
  private async getUserByEmail(email: string) {
    const cache = await this.redis.get<user>(RedisKeys.getUserByEmail(email));
    if (cache) return cache;
    const user = await this.db.user.findUnique({ where: { email } });
    await this.redis.set(RedisKeys.getUserByEmail(email), user, {
      ex: RedisExpiry.USER,
    });

    return user;
  }
  private async hash(secret: string) {
    return hash(secret);
  }

  private async verify(data: { secret: string; hashed: string }) {
    return verify(data.hashed, data.secret);
  }
  private async saveNewUser(data: CreatePasswordUserDto) {
    const user = await this.db.user.create({
      data,
    });
    await this.redis.set(RedisKeys.getUserByEmail(user.email), user, {
      ex: RedisExpiry.USER,
    });
    await this.redis.set(RedisKeys.getUserById(user.id), user, {
      ex: RedisExpiry.USER,
    });

    return user;
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
    await this.redis.set(
      RedisKeys.verificationToken(type, verification_token.id),
      verification_token,
      { ex: RedisExpiry[type] },
    );
    await this.redis.set(
      RedisKeys.verificationTokenById(verification_token.id),
      verification_token,
      { ex: RedisExpiry[type] },
    );
    return {
      otp,
      verification_token,
    };
  }
  private async sendEmail(data: {
    otp: string;
    email:string,
    type:(typeof AUTH_EVENTS)[keyof typeof AUTH_EVENTS]
  }) {
    this.emitter.emit(data.type, data)
  }

  private async getVerificationTokenById(id: string) {
    const cache = await this.redis.get<verification_token>(
      RedisKeys.getUserById(id),
    );
    if (cache && new Date(cache.expires_at) <= new Date()) return cache;
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
    await this.redis.set(RedisKeys.getUserById(userId), user, {
      ex: RedisExpiry.USER,
    });
    await this.redis.set(RedisKeys.getUserByEmail(user.email), user, {
      ex: RedisExpiry.USER,
    });

    return user;
  }
  private async cacheUser(user: user) {
    await this.redis.set(RedisKeys.getUserByEmail(user.email), user, {
      ex: RedisExpiry.USER,
    });
    await this.redis.set(RedisKeys.getUserById(user.id), user, {
      ex: RedisExpiry.USER,
    });
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
    await this.redis.set(RedisKeys.sessionById(session.id), session, {
      ex: RedisExpiry.session,
    });
    return session;
  }
  private async getUserSession(sessionId: string) {
    const key = RedisKeys.sessionById(sessionId);
    const cachedSession = await this.redis.get<SessionWithUser>(key);
    if (!cachedSession) {
      const session = await this.db.session.findUnique({
        where: {
          id: sessionId,
        },
        include: {
          user: {
            select: {
              email: true,
              name: true,
              image: true,
              id: true,
              verified_at: true,
            },
          },
        },
      });
      await this.redis.set(key, session, { ex: RedisExpiry.session });
      return session;
    }
    const now = new Date();
    if (cachedSession.expires_at <= now) {
      await this.redis.del(key);
      return null;
    }

    return cachedSession;
  }

  private async updateUserPassword(userId: string, new_password: string) {
    const hashed = await this.hash(new_password);
    const user = await this.db.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
    await this.cacheUser(user);
  }

  //api helpers
  async registerPasswordUser(data: CreatePasswordUserDto) {
    try {
      const existing_user = await this.getUserByEmail(data.email);
      if (existing_user) throw new ConflictException('users already exists');
      const hashedPassword = await this.hash(data.password);
      const new_user = await this.saveNewUser({
        ...data,
        password: hashedPassword,
      });
      const verification_token = await this.createVerificationToken(
        new_user.id,
      );
      await this.sendEmail({otp:verification_token.otp, email:new_user.email,type:AUTH_EVENTS.USER_VERIFICATION });
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

  async loginUser(data: LoginUserDto, ua: string, ip: string) {
    const user = await this.getUserByEmail(data.email);
    if (!user || !user.password) throw new NotFoundException('user not found');
    if (!user.verified_at) {
      const token = await this.createVerificationToken(
        user.id,
        'EMAIL_VERIFICATION',
      );
      await this.sendEmail({otp:token.otp, email:user.email, type:AUTH_EVENTS.USER_VERIFICATION});
      throw new BadRequestException({
        success: false,
        message: 'email not verified please check the otp sent to your email',
        verification: token.verification_token.id,
      });
    }
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

    await this.sendEmail({otp:verificationToken.otp, email:user.email,type:AUTH_EVENTS.USER_RESET_PASSWORD});

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
  public async getSession(sessionId: string) {
    const key = RedisKeys.sessionById(sessionId);

    const session = await this.getUserSession(sessionId);

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    if (new Date(session.expires_at).getTime() <= Date.now()) {
      await this.redis.del(key);

      throw new UnauthorizedException('Invalid or expired session');
    }

    return session;
  }
  async deleteSession(sessionId: string) {
    await this.redis.del(RedisKeys.sessionById(sessionId));

    await this.db.session.delete({
      where: {
        id: sessionId,
      },
    });

    return {
      success: true,
      message: 'signed out successfully',
    };
  }
}
