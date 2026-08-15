import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DbModule } from '../db/db.module';
import { DbService } from '../db/db.service';
import { RedisService } from '../redis/redis.service';

@Module({
  providers: [AuthService,DbService,RedisService],
  controllers: [AuthController],
})
export class AuthModule {}
