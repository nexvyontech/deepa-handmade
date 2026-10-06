import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { ERROR_CODES } from '../../common/errors/error-codes.js';
import { AuditService } from '../../common/auth/audit.service.js';
import { PasswordHasherService } from '../../common/auth/password-hasher.service.js';
import { RefreshSessionService } from '../../common/auth/refresh-session.service.js';
import { RefreshTokenService } from '../../common/auth/refresh-token.service.js';
import { AccessTokenService } from '../../common/auth/token.service.js';
import type { AuthenticatedUser } from '../../common/guards/auth.guard.js';
import { AuthService, type AuthResponse, type RequestMeta } from './auth.service.js';
import type { RegisterDto } from './dto/register.dto.js';

const META: RequestMeta = { ip: '127.0.0.1', userAgent: 'jest' };

/** Permissive tracked mock: fakes are asserted through `expect(...)`, not types. */
interface AnyMock {
  (...args: any[]): any;
  mockResolvedValue(value: any): AnyMock;
  mockReturnValue(value: any): AnyMock;
  mockImplementation(impl: (...args: any[]) => any): AnyMock;
}

const mock = (): AnyMock => jest.fn() as unknown as AnyMock;

function oid(): Types.ObjectId {
  return new Types.ObjectId();
}

interface Fakes {
  config: { get: AnyMock };
  hasher: { hash: AnyMock; verify: AnyMock };
  tokens: { sign: AnyMock; verify: AnyMock };
  refreshTokens: { issue: AnyMock; hash: AnyMock };
  sessions: Record<string, AnyMock>;
  audit: { record: AnyMock };
  users: Record<string, AnyMock>;
  roles: Record<string, AnyMock>;
  resetTokens: Record<string, AnyMock>;
  service: AuthService;
}

function makeService(): Fakes {
  const fakes: Omit<Fakes, 'service'> = {
    config: { get: mock().mockImplementation((key: string) => (key === 'env' ? 'test' : undefined)) },
    hasher: { hash: mock(), verify: mock() },
    tokens: { sign: mock(), verify: mock() },
    refreshTokens: { issue: mock(), hash: mock() },
    sessions: {
      create: mock(),
      findByTokenHash: mock(),
      findById: mock(),
      rotate: mock(),
      revoke: mock(),
      revokeLineage: mock(),
      revokeAllForUser: mock(),
      listForUser: mock(),
    },
    audit: { record: mock().mockResolvedValue(undefined) },
    users: {
      findOne: mock(),
      findById: mock(),
      create: mock(),
      updateOne: mock().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }),
    },
    roles: { findOne: mock(), findById: mock(), create: mock() },
    resetTokens: {
      deleteMany: mock().mockResolvedValue({}),
      create: mock().mockResolvedValue({}),
      findOne: mock(),
      updateOne: mock().mockResolvedValue({ modifiedCount: 1 }),
    },
  };

  const service = new AuthService(
    fakes.config as unknown as ConfigService,
    fakes.hasher as unknown as PasswordHasherService,
    fakes.tokens as unknown as AccessTokenService,
    fakes.refreshTokens as unknown as RefreshTokenService,
    fakes.sessions as unknown as RefreshSessionService,
    fakes.audit as unknown as AuditService,
    fakes.users as never,
    fakes.roles as never,
    fakes.resetTokens as never,
  );

  return { ...fakes, service };
}

const actor = (id: string): AuthenticatedUser => ({
  id,
  role: 'CUSTOMER',
  roles: ['CUSTOMER'],
  permissions: [],
  sessionId: undefined,
});

describe('AuthService', () => {
  describe('register', () => {
    const dto: RegisterDto = {
      name: 'Ada Lovelace',
      mobile: '9876543210',
      password: 'Passw0rd!',
      email: 'ada@example.com',
    };

    it('creates an ACTIVE customer, signs tokens and audits the registration', async () => {
      const fakes = makeService();
      const userId = oid();
      const roleId = oid();

      fakes.users.findOne.mockResolvedValue(null);
      fakes.roles.findOne.mockResolvedValue({
        _id: roleId,
        code: 'CUSTOMER',
        permissions: [],
      });
      fakes.hasher.hash.mockResolvedValue('$argon2id$fake');
      fakes.users.create.mockResolvedValue({
        _id: userId,
        profileType: 'CUSTOMER',
        name: 'Ada Lovelace',
        mobile: '9876543210',
        email: 'ada@example.com',
        passwordHash: '$argon2id$fake',
        roleId,
        status: 'ACTIVE',
        failedLoginAttempts: 0,
      });
      fakes.refreshTokens.issue.mockReturnValue({
        token: 'refresh-token',
        tokenHash: 'hash',
        expiresAt: Date.now() + 1000,
      });
      fakes.sessions.create.mockResolvedValue('session-id');
      fakes.tokens.sign.mockReturnValue({ token: 'access.jwt', expiresIn: 900 });

      const result: AuthResponse = await fakes.service.register(dto, META);

      expect(result.accessToken).toBe('access.jwt');
      expect(result.expiresIn).toBe(900);
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user).toEqual(
        expect.objectContaining({
          id: String(userId),
          mobile: '9876543210',
          role: 'CUSTOMER',
          status: 'ACTIVE',
        }),
      );
      expect(fakes.tokens.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: String(userId),
          role: 'CUSTOMER',
          sessionId: 'session-id',
        }),
      );
      expect(fakes.audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_REGISTERED', entityId: String(userId) }),
      );
    });

    it('rejects an already-registered mobile with 409', async () => {
      const fakes = makeService();
      fakes.users.findOne.mockResolvedValue({ _id: oid() });

      await expect(fakes.service.register(dto, META)).rejects.toThrow(
        expect.objectContaining({ code: ERROR_CODES.CONFLICT }),
      );
      expect(fakes.hasher.hash).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const credentials = { mobile: '9876543210', password: 'Passw0rd!' };

    it('returns 401 for an unknown mobile without leaking details', async () => {
      const fakes = makeService();
      fakes.users.findOne.mockReturnValue({ select: mock().mockResolvedValue(null) });

      await expect(fakes.service.login(credentials, META)).rejects.toThrow(
        expect.objectContaining({ code: ERROR_CODES.UNAUTHORIZED }),
      );
      expect(fakes.audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_LOGIN_FAILED',
          meta: expect.objectContaining({ reason: 'unknown_user' }),
        }),
      );
    });

    it('returns 429 while the account is locked', async () => {
      const fakes = makeService();
      fakes.users.findOne.mockReturnValue({
        select: mock().mockResolvedValue({
          _id: oid(),
          lockedUntil: new Date(Date.now() + 60_000),
          status: 'ACTIVE',
          failedLoginAttempts: 5,
        }),
      });

      await expect(fakes.service.login(credentials, META)).rejects.toThrow(
        expect.objectContaining({ code: ERROR_CODES.RATE_LIMITED }),
      );
      expect(fakes.hasher.verify).not.toHaveBeenCalled();
    });

    it('locks the account on the fifth consecutive failure', async () => {
      const fakes = makeService();
      const userId = oid();
      fakes.users.findOne.mockReturnValue({
        select: mock().mockResolvedValue({
          _id: userId,
          mobile: '9876543210',
          status: 'ACTIVE',
          failedLoginAttempts: 4,
          passwordHash: '$argon2id$fake',
          lockedUntil: undefined,
        }),
      });
      fakes.hasher.verify.mockResolvedValue(false);

      await expect(fakes.service.login(credentials, META)).rejects.toThrow(
        expect.objectContaining({ code: ERROR_CODES.UNAUTHORIZED }),
      );
      expect(fakes.users.updateOne).toHaveBeenCalledWith(
        { _id: userId },
        expect.objectContaining({
          $set: expect.objectContaining({
            failedLoginAttempts: 5,
            lockedUntil: expect.any(Date),
          }),
        }),
      );
      expect(fakes.audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ACCOUNT_LOCKED', entityId: String(userId) }),
      );
    });
  });

  describe('refresh', () => {
    it('revokes the lineage and audits when a rotated token is replayed', async () => {
      const fakes = makeService();
      const sessionId = oid();
      const userId = oid();
      const session = {
        _id: sessionId,
        userId,
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
        replacedByRef: oid(),
      };
      fakes.refreshTokens.hash.mockReturnValue('hash');
      fakes.sessions.findByTokenHash.mockResolvedValue(session);

      await expect(
        fakes.service.refresh({ refreshToken: 'replayed' }, META),
      ).rejects.toThrow(expect.objectContaining({ code: ERROR_CODES.UNAUTHORIZED }));

      expect(fakes.sessions.revokeLineage).toHaveBeenCalledWith(session);
      expect(fakes.audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TOKEN_REUSE_DETECTED' }),
      );
      expect(fakes.tokens.sign).not.toHaveBeenCalled();
    });

    it('rejects an expired refresh token', async () => {
      const fakes = makeService();
      fakes.refreshTokens.hash.mockReturnValue('hash');
      fakes.sessions.findByTokenHash.mockResolvedValue({
        _id: oid(),
        userId: oid(),
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        fakes.service.refresh({ refreshToken: 'stale' }, META),
      ).rejects.toThrow(expect.objectContaining({ code: ERROR_CODES.UNAUTHORIZED }));
    });
  });

  describe('changePassword', () => {
    it('rejects an incorrect current password and keeps sessions alive', async () => {
      const fakes = makeService();
      fakes.users.findById.mockReturnValue({
        select: mock().mockResolvedValue({
          _id: oid(),
          passwordHash: '$argon2id$fake',
          status: 'ACTIVE',
        }),
      });
      fakes.hasher.verify.mockResolvedValue(false);

      await expect(
        fakes.service.changePassword(
          actor(String(oid())),
          { currentPassword: 'WrongPass1', newPassword: 'FreshPass1' },
          META,
        ),
      ).rejects.toThrow(expect.objectContaining({ code: ERROR_CODES.BAD_REQUEST }));

      expect(fakes.sessions.revokeAllForUser).not.toHaveBeenCalled();
      expect(fakes.audit.record).not.toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    it('always answers 202-style and only exposes the token outside production', async () => {
      const fakes = makeService();
      const userId = oid();
      fakes.users.findOne.mockResolvedValue({ _id: userId, mobile: '9876543210' });

      const response = await fakes.service.requestPasswordReset(
        { identifier: '9876543210' },
        META,
      );

      expect(response.message).toMatch(/if the account exists/i);
      expect(response.resetToken).toEqual(expect.any(String));
      expect(fakes.resetTokens.create).toHaveBeenCalled();
      expect(fakes.audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_PASSWORD_RESET_REQUESTED' }),
      );
    });

    it('does not reveal unknown identifiers', async () => {
      const fakes = makeService();
      fakes.users.findOne.mockResolvedValue(null);

      const response = await fakes.service.requestPasswordReset(
        { identifier: '0000000000' },
        META,
      );

      expect(response.message).toMatch(/if the account exists/i);
      expect(response.resetToken).toBeUndefined();
      expect(fakes.resetTokens.create).not.toHaveBeenCalled();
    });
  });

  describe('confirmPasswordReset', () => {
    it('consumes the token exactly once', async () => {
      const fakes = makeService();
      fakes.resetTokens.findOne.mockResolvedValue({
        _id: oid(),
        userId: oid(),
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      });
      fakes.resetTokens.updateOne.mockResolvedValue({ modifiedCount: 0 });
      fakes.hasher.hash.mockResolvedValue('$argon2id$new');

      await expect(
        fakes.service.confirmPasswordReset(
          { token: 'reset-token', newPassword: 'FreshPass1' },
          META,
        ),
      ).rejects.toThrow(expect.objectContaining({ code: ERROR_CODES.BAD_REQUEST }));

      expect(fakes.users.updateOne).not.toHaveBeenCalled();
      expect(fakes.sessions.revokeAllForUser).not.toHaveBeenCalled();
    });
  });
});
