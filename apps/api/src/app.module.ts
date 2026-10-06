import 'dotenv/config';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware.js';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware.js';
import { RequestContextService } from './common/context/request-context.service.js';
import { AuthGuard } from './common/guards/auth.guard.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import configuration from './config/configuration.js';
import { validateEnv } from './config/env.validation.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { AuthModule } from './modules/auth/AuthModule.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
      cache: true,
      expandVariables: true,
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    RequestContextService,
    // Global guards run in registration order: authenticate first, then
    // authorize by role, then by permission.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware, RateLimitMiddleware).forRoutes('*');
  }
}