import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security Middleware
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : true,
    credentials: true,
  });

  // Global Route Prefix
  app.setGlobalPrefix('api/v1');

  // Input Validation Pipe (Enforcing strict DTO rules per .coderabbit.yaml)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // OpenAPI / Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CLM Platform Control Plane API')
    .setDescription('Enterprise Certificate Lifecycle Management SaaS API & Satellite Gateway Ingress')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`Control plane running at http://localhost:${port}/api/v1`);
  logger.log(`Swagger OpenAPI documentation at http://localhost:${port}/api/docs`);
}

bootstrap();

