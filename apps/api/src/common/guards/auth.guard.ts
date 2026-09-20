import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ApiException } from '../exceptions/api.exception.js';
import { ERROR_CODES } from '../errors/error-codes.js';

/**
 * Authentication-aware guard scaffold.
 *
 * Phase 3 does not implement the authentication workflow yet. This guard is the
 * architecture placeholder: it reads `@Public()` metadata so public endpoints
 * remain reachable, and rejects any other request until a real JWT strategy is
 * wired in Phase 4 (as a global guard via APP_GUARD provider).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: unknown }>();
    if (request.user) {
      return true;
    }

    throw new ApiException(
      HttpStatus.UNAUTHORIZED,
      ERROR_CODES.UNAUTHORIZED,
      'Authentication required',
    );
  }
}