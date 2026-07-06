import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
    credentials: true,
  });

  // API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted values are provided
      transform: true, // Transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Job Board API')
    .setDescription('A scalable RESTful API for job board platform')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'Authentication and authorization endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Companies', 'Company profile endpoints')
    .addTag('Jobs', 'Job posting and search endpoints')
    .addTag('Applications', 'Job application endpoints')
    .addTag('Categories', 'Job category endpoints')
    .addTag('Notifications', 'Notification endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
    ╔════════════════════════════════════════════╗
    ║                                            ║
    ║   🚀 Job Board API is running!            ║
    ║                                            ║
    ║   📍 Server:  http://localhost:${port}       ║
    ║   📚 API Docs: http://localhost:${port}/api/docs ║
    ║   🔧 Environment: ${process.env.NODE_ENV || 'development'}            ║
    ║                                            ║
    ╚════════════════════════════════════════════╝
  `);
}

bootstrap();
