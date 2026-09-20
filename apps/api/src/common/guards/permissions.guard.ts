import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Permission } from '@deepa/shared';
import { PERMISSIONS_KEY } from '../decorators/auth.decorators.js';
import { ApiException } from '../exceptions/api.exception.js';
import { ERROR_CODES } from '../errors/error-codes.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    permissions?: Permission[] | string[];
  };
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
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

    const granted: string[] = user.permissions ?? [];
    const hasAll = required.every((permission) => granted.includes(permission));

    if (!hasAll) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.FORBIDDEN,
        'Insufficient permission to access this resource',
      );
    }

    return true;
  }
}