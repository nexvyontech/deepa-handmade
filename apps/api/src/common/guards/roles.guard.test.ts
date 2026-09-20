import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES } from '@deepa/shared';
import { RolesGuard } from './roles.guard.js';
import { Roles } from '../decorators/roles.decorator.js';
import { ERROR_CODES } from '../errors/error-codes.js';

class ProtectedController {
  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  staffOnly(): void {
    /* no-op */
  }
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  const reflector = new Reflector();

  const context = (user: unknown): ExecutionContext =>
    ({
      getHandler: () => ProtectedController.prototype.staffOnly,
      getClass: () => ProtectedController,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    guard = new RolesGuard(reflector);
  });

  it('allows a user with a required role', () => {
    expect(guard.canActivate(context({ id: '1', roles: [ROLES.ADMIN] }))).toBe(true);
  });

  it('denies a user without a matching role', () => {
    expect(() => guard.canActivate(context({ id: '1', roles: [ROLES.PRODUCTION] }))).toThrow(
      expect.objectContaining({ code: ERROR_CODES.FORBIDDEN }),
    );
  });

  it('denies anonymous access', () => {
    expect(() => guard.canActivate(context(undefined))).toThrow(
      expect.objectContaining({ code: ERROR_CODES.UNAUTHORIZED }),
    );
  });

  it('allows execution when no roles are required', () => {
    class OpenController {
      anyone(): void {
        /* no-op */
      }
    }
    const guardWithoutMeta = new RolesGuard(reflector);
    const openContext = {
      getHandler: () => OpenController.prototype.anyone,
      getClass: () => OpenController,
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as unknown as ExecutionContext;

    expect(guardWithoutMeta.canActivate(openContext)).toBe(true);
  });
});