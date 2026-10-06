import { CanActivate, ExecutionContext, HttpStatus, Injectable, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ApiException } from '../exceptions/api.exception.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { AccessTokenService } from '../auth/token.service.js';

/**
 * Shape attached to `request.user` by {@link AuthGuard}.
 *
 * `roles` mirrors `role` as an array so `RolesGuard` can match against any of
 * the user's roles; permissions come from the access-token claims (no
 * per-request database read — see Phase 4 tradeoff notes).
 */
export interface AuthenticatedUser {
  id: string;
  role: string;
  roles: string[];
  permissions: string[];
  sessionId?: string;
}

/**
 * Global authentication guard (registered via APP_GUARD in Phase 4).
 *
 * Flow: `@Public()` short-circuit → existing `request.user` (tests / trusted
 * middleware) → `Authorization: Bearer <jwt>` parse → verify → attach user.
 * Verification is synchronous per request and stateless.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly accessTokenService?: AccessTokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      headers?: { authorization?: string };
    }>();
    if (request.user) {
      return true;
    }

    const header = request.headers?.authorization;
    const [scheme, token] = (header ?? '').split(' ');
    if (!header || scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
        'Authentication required',
      );
    }

    if (!this.accessTokenService) {
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'Authentication service is unavailable',
      );
    }

    const payload = this.accessTokenService.verify(token);
    request.user = {
      id: payload.sub,
      role: payload.role,
      roles: [payload.role],
      permissions: payload.permissions ?? [],
      sessionId: payload.sessionId,
    };
    return true;
  }
}
