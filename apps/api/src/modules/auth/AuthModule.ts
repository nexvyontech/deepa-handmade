import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditService } from '../../common/auth/audit.service.js';
import { PasswordHasherService } from '../../common/auth/password-hasher.service.js';
import { RefreshSessionService } from '../../common/auth/refresh-session.service.js';
import { RefreshTokenService } from '../../common/auth/refresh-token.service.js';
import { AccessTokenService } from '../../common/auth/token.service.js';
import {
  AUDIT_LOG_MODEL,
  auditLogSchema,
  PASSWORD_RESET_TOKEN_MODEL,
  passwordResetTokenSchema,
  ROLE_MODEL,
  roleSchema,
  USER_MODEL,
  USER_REFRESH_TOKEN_MODEL,
  userRefreshTokenSchema,
  userSchema,
} from '../../database/schemas/index.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

const hasMongoUri = (): boolean => !!process.env.MONGODB_URI;

/**
 * Authentication module (Phase 4).
 *
 * Feature registration is conditional on `MONGODB_URI` (mirrors
 * `DatabaseModule`) so the documented no-database boot mode keeps working:
 * repositories are optional dependencies and any workflow that needs them
 * fails with 503 SERVICE_UNAVAILABLE.
 */
@Module({
  imports: hasMongoUri()
    ? [
        MongooseModule.forFeature([
          { name: USER_MODEL, schema: userSchema },
          { name: ROLE_MODEL, schema: roleSchema },
          { name: USER_REFRESH_TOKEN_MODEL, schema: userRefreshTokenSchema },
          { name: PASSWORD_RESET_TOKEN_MODEL, schema: passwordResetTokenSchema },
          { name: AUDIT_LOG_MODEL, schema: auditLogSchema },
        ]),
      ]
    : [],
  controllers: [AuthController],
  providers: [
    PasswordHasherService,
    AccessTokenService,
    RefreshTokenService,
    RefreshSessionService,
    AuditService,
    AuthService,
  ],
  exports: [AccessTokenService],
})
export class AuthModule {}
