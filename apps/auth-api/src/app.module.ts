import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DbModule } from './db/db.module';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis/redis.module';
import {EventEmitterModule} from '@nestjs/event-emitter'
import { EmailServiceModule } from './email-service/email-service.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    DbModule,
    RedisModule,
    EventEmitterModule.forRoot(),
    EmailServiceModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
