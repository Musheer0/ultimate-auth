import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import  cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      forbidUnknownValues: true,
      whitelist:true,
      
    }),
  );
  app.use(cookieParser())
  app.enableCors({
  origin: 'https://your-frontend.com',
  credentials: true,
});
app.getHttpAdapter().getInstance().disable("x-powered-by")
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
