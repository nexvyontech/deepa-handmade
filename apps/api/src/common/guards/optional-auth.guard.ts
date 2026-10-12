import { CanActivate, ExecutionContext, HttpStatus, Injectable, Optional } from '@nestjs/common';
import { ApiException } from '../exceptions/api.exception.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { AccessTokenService } from '../auth/token.service.js';
import type { AuthenticatedUser } from './auth.guard.js';

/**
 * Optional authentication for customer surfaces (cart/checkout).
 *
 * Attaches `request.user` when a valid bearer token is presented, and passes
 * through (with `request.user` undefined) when no token is present so guest
 * flows work. An *invalid* presented token is still rejected — guests must
 * simply not send a token.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    @Optional() private readonly accessTokenService?: AccessTokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      headers?: { authorization?: string };
    }>();
    if (request.user) {
      return true;
    }

    const header = request.headers?.authorization;
    const [scheme, token] = (header ?? '').split(' ');
    if (!header || !token) {
      return true;
    }
    if (scheme?.toLowerCase() !== 'bearer') {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
        'Unsupported authorization scheme',
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