import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { seconds, ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class AuthenticatedThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    if (!req.sessionId) throw new UnauthorizedException();
    return req.sessionId!;
  }

  protected getLimit() {
    return Promise.resolve(1);
  }

  protected getTtl() {
    return Promise.resolve(seconds(10));
  }
}
@Injectable()
export class AuthThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    const body = req.body;
    if (!req?.body?.email) throw new BadRequestException();
    return req.body.email;
  }

  protected getLimit() {
    return Promise.resolve(3);
  }

  protected getTtl() {
    return Promise.resolve(seconds(30));
  }
}
