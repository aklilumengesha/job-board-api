import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Core modules
import { PrismaModule } from './core/prisma/prisma.module';
import { LoggerModule } from './core/logger/logger.module';

// Infrastructure modules
import { EmailModule } from './infrastructure/email/email.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { CacheModule } from './infrastructure/cache/cache.module';

// Business modules
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { CompanyModule } from './modules/company/company.module';
import { JobModule } from './modules/job/job.module';
import { ApplicationModule } from './modules/application/application.module';
import { JwtAuthGuard } from './modules/auth/guards';

// Common
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL || '900', 10) * 1000, // 15 minutes
        limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // 100 requests
      },
    ]),

    // Core modules
    PrismaModule,
    LoggerModule,

    // Infrastructure modules
    EmailModule,
    StorageModule,
    QueueModule,
    CacheModule,

    // Business modules
    AuthModule,
    UserModule,
    CompanyModule,
    JobModule,
    ApplicationModule,
    // CategoryModule,
    // NotificationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global JWT authentication guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // Global response transformer
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
