import { jest } from '@jest/globals';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard.js';
import { Public } from '../decorators/public.decorator.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { ApiException } from '../exceptions/api.exception.js';
import type { AccessTokenService } from '../auth/token.service.js';

class PublicController {
  @Public()
  hello(): void {
    /* no-op */
  }
}

class ProtectedController {
  secret(): void {
    /* no-op */
  }
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  const reflector = new Reflector();

  const context = (controller: unknown, user?: unknown): ExecutionContext =>
    ({
      getHandler: () => (controller as { prototype: { secret(): void } }).prototype.secret,
      getClass: () => controller,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    guard = new AuthGuard(reflector);
  });

  it('allows public routes without authentication', () => {
    const publicContext = {
      getHandler: () => PublicController.prototype.hello,
      getClass: () => PublicController,
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(publicContext)).toBe(true);
  });

  it('rejects protected routes without a user until auth lands (Phase 4)', () => {
    expect(() => guard.canActivate(context(ProtectedController))).toThrow(
      expect.objectContaining({ code: ERROR_CODES.UNAUTHORIZED }),
    );
  });

  it('allows protected routes when a user is attached', () => {
    expect(guard.canActivate(context(ProtectedController, { id: '1' }))).toBe(true);
  });
});

describe('AuthGuard bearer-token flow', () => {
  const reflector = new Reflector();
  let verify: jest.Mock;
  let guard: AuthGuard;

  interface TestRequest {
    user?: unknown;
    headers?: { authorization?: string };
  }

  const bearerContext = (request: TestRequest): ExecutionContext =>
    ({
      getHandler: () => ProtectedController.prototype.secret,
      getClass: () => ProtectedController,
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    verify = jest.fn();
    guard = new AuthGuard(reflector, { verify } as unknown as AccessTokenService);
  });

  it('attaches the verified claims to request.user', () => {
    verify.mockReturnValue({
      sub: 'user-1',
      role: 'SUPER_ADMIN',
      permissions: ['staff.manage'],
      sessionId: 'session-1',
    });
    const request: TestRequest = { headers: { authorization: 'Bearer signed.jwt' } };

    expect(guard.canActivate(bearerContext(request))).toBe(true);
    expect(request.user).toEqual({
      id: 'user-1',
      role: 'SUPER_ADMIN',
      roles: ['SUPER_ADMIN'],
      permissions: ['staff.manage'],
      sessionId: 'session-1',
    });
    expect(verify).toHaveBeenCalledWith('signed.jwt');
  });

  it('rejects non-bearer authorization schemes without verifying', () => {
    const request: TestRequest = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };

    expect(() => guard.canActivate(bearerContext(request))).toThrow(
      expect.objectContaining({ code: ERROR_CODES.UNAUTHORIZED }),
    );
    expect(verify).not.toHaveBeenCalled();
  });

  it('propagates verification errors such as an expired token', () => {
    verify.mockImplementation(() => {
      throw new ApiException(401, ERROR_CODES.TOKEN_EXPIRED, 'Access token has expired');
    });
    const request: TestRequest = { headers: { authorization: 'Bearer expired.jwt' } };

    expect(() => guard.canActivate(bearerContext(request))).toThrow(
      expect.objectContaining({ code: ERROR_CODES.TOKEN_EXPIRED }),
    );
  });

  it('fails with 503 when a token is presented but no token service is wired', () => {
    const bareGuard = new AuthGuard(reflector);
    const request: TestRequest = { headers: { authorization: 'Bearer signed.jwt' } };

    expect(() => bareGuard.canActivate(bearerContext(request))).toThrow(
      expect.objectContaining({ code: ERROR_CODES.SERVICE_UNAVAILABLE }),
    );
  });
});