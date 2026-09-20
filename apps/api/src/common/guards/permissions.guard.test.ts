import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS } from '@deepa/shared';
import { PermissionsGuard } from './permissions.guard.js';
import { Permissions } from '../decorators/auth.decorators.js';
import { ERROR_CODES } from '../errors/error-codes.js';

class ProtectedController {
  @Permissions(PERMISSIONS.ORDER_READ, PERMISSIONS.PAYMENT_VERIFY)
  finance(): void {
    /* no-op */
  }
}

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  const reflector = new Reflector();

  const context = (user: unknown): ExecutionContext =>
    ({
      getHandler: () => ProtectedController.prototype.finance,
      getClass: () => ProtectedController,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    guard = new PermissionsGuard(reflector);
  });

  it('allows a user granted every required permission', () => {
    const user = { id: '1', permissions: [PERMISSIONS.ORDER_READ, PERMISSIONS.PAYMENT_VERIFY] };
    expect(guard.canActivate(context(user))).toBe(true);
  });

  it('denies when a required permission is missing', () => {
    const user = { id: '1', permissions: [PERMISSIONS.ORDER_READ] };
    expect(() => guard.canActivate(context(user))).toThrow(
      expect.objectContaining({ code: ERROR_CODES.FORBIDDEN }),
    );
  });

  it('denies anonymous access', () => {
    expect(() => guard.canActivate(context(undefined))).toThrow(
      expect.objectContaining({ code: ERROR_CODES.UNAUTHORIZED }),
    );
  });
});