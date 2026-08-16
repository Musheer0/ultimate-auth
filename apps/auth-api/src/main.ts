import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import basicAuth from 'express-basic-auth';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      forbidUnknownValues: true,
      whitelist: true,
    }),
  );
  app.use(cookieParser());
  app.enableCors({
    origin: 'https://your-frontend.com',
    credentials: true,
  });
  app.use(
    ['/docs', 'docs-json'],
    basicAuth({
      users: {
        admin: process.env.DOCS_PASS || '', //empty for dev
      },
      challenge: true,
    }),
  );
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  const config = new DocumentBuilder()
    .setTitle('Ultimate Auth')
    .setVersion('1.0.0')
    .setDescription('Authentication API')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      displayRequestDuration: true,
    },
    swaggerUiEnabled: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
