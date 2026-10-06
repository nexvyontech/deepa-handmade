import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PasswordHasherService } from '../../common/auth/password-hasher.service.js';
import { RefreshSessionService } from '../../common/auth/refresh-session.service.js';
import { RefreshTokenService } from '../../common/auth/refresh-token.service.js';
import { AccessTokenService } from '../../common/auth/token.service.js';
import {
  PASSWORD_RESET_TOKEN_MODEL,
  passwordResetTokenSchema,
  ROLE_MODEL,
  roleSchema,
  USER_MODEL,
  USER_REFRESH_TOKEN_MODEL,
  userRefreshTokenSchema,
  userSchema,
} from '../../database/schemas/index.js';
import { AuditModule } from '../audit/AuditModule.js';
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
  imports: [
    AuditModule,
    ...(hasMongoUri()
      ? [
          MongooseModule.forFeature([
            { name: USER_MODEL, schema: userSchema },
            { name: ROLE_MODEL, schema: roleSchema },
            { name: USER_REFRESH_TOKEN_MODEL, schema: userRefreshTokenSchema },
            { name: PASSWORD_RESET_TOKEN_MODEL, schema: passwordResetTokenSchema },
          ]),
        ]
      : []),
  ],
  controllers: [AuthController],
  providers: [
    PasswordHasherService,
    AccessTokenService,
    RefreshTokenService,
    RefreshSessionService,
    AuthService,
  ],
  exports: [AccessTokenService],
})
export class AuthModule {}
