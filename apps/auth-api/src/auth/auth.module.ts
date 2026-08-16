import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DbModule } from '../db/db.module';
import { DbService } from '../db/db.service';
import { RedisService } from '../redis/redis.service';
import { seconds, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
if (!process.env.REDIS_URL) {
  throw new Error('redis url not found');
}
@Module({
  providers: [AuthService, DbService, RedisService],
  controllers: [AuthController],
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          limit: 10,
          ttl: seconds(60),
        },
      ],
      storage: new ThrottlerStorageRedisService(
        new Redis(process.env.REDIS_URL!),
      ),
    }),
  ],
})
export class AuthModule {}
