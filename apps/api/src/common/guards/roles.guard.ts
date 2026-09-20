import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Role } from '@deepa/shared';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { ApiException } from '../exceptions/api.exception.js';
import { ERROR_CODES } from '../errors/error-codes.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    roles?: Role[] | string[];
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
        'Authentication required',
      );
    }

    const userRoles: string[] = user.roles ?? [];
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.FORBIDDEN,
        'Insufficient role to access this resource',
      );
    }

    return true;
  }
}