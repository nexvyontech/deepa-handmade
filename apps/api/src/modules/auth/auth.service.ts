import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createHash, randomBytes } from 'node:crypto';
import { Permission, ROLES } from '@deepa/shared';
import { ERROR_CODES } from '../../common/errors/error-codes.js';
import { ApiException } from '../../common/exceptions/api.exception.js';
import { AuditService } from '../../common/auth/audit.service.js';
import { PasswordHasherService } from '../../common/auth/password-hasher.service.js';
import { RefreshSessionService, RefreshSessionView } from '../../common/auth/refresh-session.service.js';
import { RefreshTokenService } from '../../common/auth/refresh-token.service.js';
import { AccessTokenService } from '../../common/auth/token.service.js';
import type { AuthenticatedUser } from '../../common/guards/auth.guard.js';
import {
  PASSWORD_RESET_TOKEN_MODEL,
  ROLE_MODEL,
  USER_MODEL,
} from '../../database/schemas/index.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { PasswordResetConfirmDto, PasswordResetRequestDto } from './dto/password-reset.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { RegisterDto } from './dto/register.dto.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const INVALID_CREDENTIALS = 'Invalid credentials';

type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'PENDING_VERIFICATION';

interface UserDoc {
  _id: Types.ObjectId;
  profileType: string;
  name: string;
  mobile: string;
  email?: string;
  passwordHash: string;
  roleId: Types.ObjectId;
  status: UserStatus;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  passwordChangedAt?: Date;
}

interface RoleDoc {
  _id: Types.ObjectId;
  name: string;
  code: string;
  permissions: Permission[];
  isSystem?: boolean;
  description?: string;
}

interface PasswordResetTokenDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
}

/** Client-supplied request context used for session + audit metadata. */
export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface PublicUser {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  role: string;
  permissions: string[];
  status: UserStatus;
  lastLoginAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  user: PublicUser;
}

export interface PasswordResetRequestResponse {
  message: string;
  /** Returned outside production so local flows can complete without email/SMS delivery. */
  resetToken?: string;
}

/**
 * Authentication workflows (Phase 4).
 *
 * Model repositories are injected optionally because the app supports booting
 * without `MONGODB_URI` (documented no-DB mode); in that mode every workflow
 * fails fast with 503 instead of crashing bootstrap.
 *
 * Anti-enumeration: unknown-user and bad-password failures return the same
 * 401 message; password-reset requests always return 202 regardless of whether
 * the identifier exists.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly hasher: PasswordHasherService,
    private readonly tokens: AccessTokenService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly sessions: RefreshSessionService,
    private readonly audit: AuditService,
    @Optional() @InjectModel(USER_MODEL) private readonly userModel?: Model<UserDoc>,
    @Optional() @InjectModel(ROLE_MODEL) private readonly roleModel?: Model<RoleDoc>,
    @Optional()
    @InjectModel(PASSWORD_RESET_TOKEN_MODEL)
    private readonly resetTokenModel?: Model<PasswordResetTokenDoc>,
  ) {}

  // ---------------------------------------------------------------- register

  async register(dto: RegisterDto, meta: RequestMeta): Promise<AuthResponse> {
    const users = this.requireModel(this.userModel, 'User');
    const mobile = dto.mobile.trim();
    const email = dto.email?.trim().toLowerCase() || undefined;

    const clash = await users.findOne({ $or: [{ mobile }, ...(email ? [{ email }] : [])] });
    if (clash) {
      throw ApiException.conflict('Mobile number or email is already registered');
    }

    const role = await this.ensureCustomerRole();
    const passwordHash = await this.hasher.hash(dto.password);

    let created;
    try {
      created = await users.create({
        profileType: 'CUSTOMER',
        name: dto.name.trim(),
        mobile,
        email,
        passwordHash,
        roleId: role._id,
        status: 'ACTIVE',
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw ApiException.conflict('Mobile number or email is already registered');
      }
      throw error;
    }

    const userId = String(created._id);
    await this.audit.record({
      actorId: userId,
      actorRole: role.code,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: userId,
      meta: { ip: meta.ip, userAgent: meta.userAgent },
    });

    return this.issueSession(created, role, meta);
  }

  // ------------------------------------------------------------------- login

  async login(dto: LoginDto, meta: RequestMeta): Promise<AuthResponse> {
    const users = this.requireModel(this.userModel, 'User');
    const user = await users.findOne({ mobile: dto.mobile.trim() }).select('+passwordHash');
    const auditMeta = { ip: meta.ip, userAgent: meta.userAgent };

    if (!user) {
      await this.audit.record({
        action: 'USER_LOGIN_FAILED',
        entityType: 'User',
        meta: { ...auditMeta, reason: 'unknown_user' },
      });
      throw ApiException.unauthorized(INVALID_CREDENTIALS);
    }

    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      throw new ApiException(
        429,
        ERROR_CODES.RATE_LIMITED,
        'Account is temporarily locked due to repeated failed login attempts',
      );
    }

    const passwordOk = await this.verifyPassword(user.passwordHash, dto.password);
    if (!passwordOk) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      const locked = attempts >= MAX_FAILED_ATTEMPTS;
      if (locked) {
        await users.updateOne(
          { _id: user._id },
          {
            $set: { failedLoginAttempts: attempts, lockedUntil: new Date(now.getTime() + LOCK_DURATION_MS) },
          },
        );
        await this.audit.record({
          actorId: String(user._id),
          action: 'ACCOUNT_LOCKED',
          entityType: 'User',
          entityId: String(user._id),
          meta: { ...auditMeta, reason: 'too_many_failures' },
        });
      } else {
        await users.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: attempts } });
      }
      await this.audit.record({
        actorId: String(user._id),
        action: 'USER_LOGIN_FAILED',
        entityType: 'User',
        entityId: String(user._id),
        meta: { ...auditMeta, reason: 'bad_password', attempts },
      });
      throw ApiException.unauthorized(INVALID_CREDENTIALS);
    }

    if (user.status !== 'ACTIVE') {
      throw ApiException.forbidden('Account is not active');
    }

    const role = await this.loadRole(user.roleId);
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = now;
    await users.updateOne(
      { _id: user._id },
      { $set: { failedLoginAttempts: 0, lastLoginAt: now }, $unset: { lockedUntil: '' } },
    );

    await this.audit.record({
      actorId: String(user._id),
      actorRole: role.code,
      action: 'USER_LOGIN_SUCCEEDED',
      entityType: 'User',
      entityId: String(user._id),
      meta: auditMeta,
    });

    return this.issueSession(user, role, meta);
  }

  // ----------------------------------------------------------------- refresh

  async refresh(dto: RefreshDto, meta: RequestMeta): Promise<AuthResponse> {
    const auditMeta = { ip: meta.ip, userAgent: meta.userAgent };
    const session = await this.sessions.findByTokenHash(this.refreshTokens.hash(dto.refreshToken));

    if (!session) {
      throw ApiException.unauthorized('Invalid refresh token');
    }

    if (session.revokedAt) {
      // Reuse of a rotated token: revoke the whole lineage it belongs to.
      await this.sessions.revokeLineage(session);
      await this.audit.record({
        actorId: String(session.userId),
        action: 'TOKEN_REUSE_DETECTED',
        entityType: 'UserRefreshToken',
        entityId: String(session._id),
        meta: auditMeta,
      });
      throw ApiException.unauthorized('Refresh token is no longer valid');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw ApiException.unauthorized('Refresh token has expired');
    }

    const users = this.requireModel(this.userModel, 'User');
    const user = await users.findById(session.userId);
    if (!user) {
      throw ApiException.unauthorized('Invalid refresh token');
    }
    if (user.status !== 'ACTIVE') {
      await this.sessions.revoke(String(session._id));
      throw ApiException.forbidden('Account is not active');
    }

    const role = await this.loadRole(user.roleId);
    const next = this.refreshTokens.issue();
    const sessionId = await this.sessions.rotate(session, {
      userId: String(user._id),
      tokenHash: next.tokenHash,
      expiresAt: next.expiresAt,
      userAgent: meta.userAgent,
      ip: meta.ip,
    });

    const access = this.tokens.sign({
      sub: String(user._id),
      role: role.code,
      permissions: role.permissions ?? [],
      sessionId,
    });

    return {
      accessToken: access.token,
      expiresIn: access.expiresIn,
      refreshToken: next.token,
      user: this.toPublicUser(user, role),
    };
  }

  // ------------------------------------------------------------------ logout

  async logout(actor: AuthenticatedUser, meta: RequestMeta): Promise<void> {
    if (actor.sessionId && Types.ObjectId.isValid(actor.sessionId)) {
      await this.sessions.revoke(actor.sessionId);
    }
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'USER_LOGOUT',
      entityType: 'User',
      entityId: actor.id,
      meta: { ip: meta.ip, userAgent: meta.userAgent },
    });
  }

  async logoutAll(actor: AuthenticatedUser, meta: RequestMeta): Promise<void> {
    await this.sessions.revokeAllForUser(actor.id);
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'USER_LOGOUT_ALL',
      entityType: 'User',
      entityId: actor.id,
      meta: { ip: meta.ip, userAgent: meta.userAgent },
    });
  }

  // --------------------------------------------------------------------- me

  async me(actor: AuthenticatedUser): Promise<PublicUser> {
    const users = this.requireModel(this.userModel, 'User');
    const user = await users.findById(actor.id);
    if (!user) {
      throw ApiException.notFound('User not found');
    }
    return this.toPublicUser(user, await this.loadRole(user.roleId));
  }

  // --------------------------------------------------------- change password

  async changePassword(
    actor: AuthenticatedUser,
    dto: ChangePasswordDto,
    meta: RequestMeta,
  ): Promise<void> {
    const users = this.requireModel(this.userModel, 'User');
    const user = await users.findById(actor.id).select('+passwordHash');
    if (!user) {
      throw ApiException.notFound('User not found');
    }

    const currentOk = await this.verifyPassword(user.passwordHash, dto.currentPassword);
    if (!currentOk) {
      throw ApiException.badRequest('Current password is incorrect');
    }

    const passwordHash = await this.hasher.hash(dto.newPassword);
    await users.updateOne(
      { _id: user._id },
      { $set: { passwordHash, passwordChangedAt: new Date() } },
    );
    // A password change invalidates every outstanding refresh session.
    await this.sessions.revokeAllForUser(actor.id);

    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'USER_PASSWORD_CHANGED',
      entityType: 'User',
      entityId: actor.id,
      meta: { ip: meta.ip, userAgent: meta.userAgent },
    });
  }

  // ------------------------------------------------------------ reset request

  async requestPasswordReset(
    dto: PasswordResetRequestDto,
    meta: RequestMeta,
  ): Promise<PasswordResetRequestResponse> {
    const users = this.requireModel(this.userModel, 'User');
    const identifier = dto.identifier.trim();
    const auditMeta = { ip: meta.ip, userAgent: meta.userAgent };
    const user = await users.findOne({
      $or: [{ mobile: identifier }, { email: identifier.toLowerCase() }],
    });

    if (user) {
      const resetTokens = this.requireModel(this.resetTokenModel, 'PasswordResetToken');
      await resetTokens.deleteMany({ userId: user._id, usedAt: null });
      const raw = randomBytes(32).toString('base64url');
      await resetTokens.create({
        userId: user._id,
        tokenHash: sha256(raw),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      });
      await this.audit.record({
        actorId: String(user._id),
        action: 'USER_PASSWORD_RESET_REQUESTED',
        entityType: 'User',
        entityId: String(user._id),
        meta: auditMeta,
      });

      const response: PasswordResetRequestResponse = {
        message: 'If the account exists, a password reset token has been issued.',
      };
      if (this.config.get<string>('env') !== 'production') {
        response.resetToken = raw;
      }
      return response;
    }

    await this.audit.record({
      action: 'USER_PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      meta: { ...auditMeta, reason: 'unknown_identifier' },
    });
    return { message: 'If the account exists, a password reset token has been issued.' };
  }

  async confirmPasswordReset(
    dto: PasswordResetConfirmDto,
    meta: RequestMeta,
  ): Promise<void> {
    const resetTokens = this.requireModel(this.resetTokenModel, 'PasswordResetToken');
    const invalid = () => ApiException.badRequest('Password reset token is invalid or has expired');

    const token = await resetTokens.findOne({
      tokenHash: sha256(dto.token),
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });
    if (!token) {
      throw invalid();
    }

    const consumed = await resetTokens.updateOne(
      { _id: token._id, usedAt: null },
      { $set: { usedAt: new Date() } },
    );
    if (consumed.modifiedCount === 0) {
      throw invalid();
    }

    const users = this.requireModel(this.userModel, 'User');
    const passwordHash = await this.hasher.hash(dto.newPassword);
    const updated = await users.updateOne(
      { _id: token.userId },
      {
        $set: { passwordHash, passwordChangedAt: new Date(), failedLoginAttempts: 0 },
        $unset: { lockedUntil: '' },
      },
    );
    if (updated.matchedCount === 0) {
      throw invalid();
    }

    await this.sessions.revokeAllForUser(String(token.userId));
    await this.audit.record({
      actorId: String(token.userId),
      action: 'USER_PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: String(token.userId),
      meta: { ip: meta.ip, userAgent: meta.userAgent },
    });
  }

  // ---------------------------------------------------------------- sessions

  async listSessions(actor: AuthenticatedUser): Promise<RefreshSessionView[]> {
    return this.sessions.listForUser(actor.id);
  }

  async revokeUserSessions(
    targetUserId: string,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<void> {
    const users = this.requireModel(this.userModel, 'User');
    const target = await users.findById(targetUserId);
    if (!target) {
      throw ApiException.notFound('User not found');
    }

    const revoked = await this.sessions.revokeAllForUser(targetUserId);
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'USER_SESSION_REVOKED',
      entityType: 'User',
      entityId: targetUserId,
      after: { revokedSessions: revoked },
      meta: { ip: meta.ip, userAgent: meta.userAgent },
    });
  }

  async listUserSessions(targetUserId: string): Promise<RefreshSessionView[]> {
    const users = this.requireModel(this.userModel, 'User');
    const target = await users.findById(targetUserId);
    if (!target) {
      throw ApiException.notFound('User not found');
    }
    return this.sessions.listForUser(targetUserId);
  }

  // ----------------------------------------------------------------- helpers

  private async issueSession(
    user: UserDoc,
    role: RoleDoc,
    meta: RequestMeta,
  ): Promise<AuthResponse> {
    const refresh = this.refreshTokens.issue();
    const sessionId = await this.sessions.create({
      userId: String(user._id),
      tokenHash: refresh.tokenHash,
      expiresAt: refresh.expiresAt,
      userAgent: meta.userAgent,
      ip: meta.ip,
    });

    const access = this.tokens.sign({
      sub: String(user._id),
      role: role.code,
      permissions: role.permissions ?? [],
      sessionId,
    });

    return {
      accessToken: access.token,
      expiresIn: access.expiresIn,
      refreshToken: refresh.token,
      user: this.toPublicUser(user, role),
    };
  }

  private async ensureCustomerRole(): Promise<RoleDoc> {
    const roles = this.requireModel(this.roleModel, 'Role');
    const existing = await roles.findOne({ code: ROLES.CUSTOMER });
    if (existing) {
      return existing;
    }
    try {
      return await roles.create({
        name: 'Customer',
        code: ROLES.CUSTOMER,
        permissions: [],
        isSystem: true,
        description: 'Default role for storefront customers',
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const winner = await roles.findOne({ code: ROLES.CUSTOMER });
        if (winner) {
          return winner;
        }
      }
      throw error;
    }
  }

  private async loadRole(roleId: Types.ObjectId): Promise<RoleDoc> {
    const roles = this.requireModel(this.roleModel, 'Role');
    const role = await roles.findById(roleId);
    if (!role) {
      throw new ApiException(
        503,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'Role configuration is missing',
      );
    }
    return role;
  }

  private async verifyPassword(hash: string | undefined, plain: string): Promise<boolean> {
    if (!hash) {
      return false;
    }
    try {
      return await this.hasher.verify(hash, plain);
    } catch {
      return false;
    }
  }

  private toPublicUser(user: UserDoc, role: RoleDoc): PublicUser {
    return {
      id: String(user._id),
      name: user.name,
      mobile: user.mobile,
      email: user.email || undefined,
      role: role.code,
      permissions: role.permissions ?? [],
      status: user.status,
      lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : undefined,
    };
  }

  private requireModel<T>(model: Model<T> | undefined, entity: string): Model<T> {
    if (!model) {
      throw new ApiException(
        503,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        `Authentication requires a configured database (${entity})`,
      );
    }
    return model;
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function isDuplicateKeyError(error: unknown): boolean {
  return (error as { code?: number } | undefined)?.code === 11000;
}
