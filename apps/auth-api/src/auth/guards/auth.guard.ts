import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { headers } from '../../constants/headers';
import { cookies } from '../../constants/cookies';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request>();
    const sessionId =
      req.headers[headers.SESSION] || req.cookies[cookies.SESSION];
    if (!sessionId) throw new UnauthorizedException();
    req.sessionId = sessionId;
    return true;
  }
}
