import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard.js';
import { Public } from '../decorators/public.decorator.js';
import { ERROR_CODES } from '../errors/error-codes.js';

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