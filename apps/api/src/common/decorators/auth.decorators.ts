import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Permission } from '@deepa/shared';

export const PERMISSIONS_KEY = 'permissions';

export const Permissions = (...permissions: Permission[]): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<{ user?: unknown }>();
    const user = request.user;
    if (typeof data === 'string' && data && user && typeof user === 'object') {
      return (user as Record<string, unknown>)[data];
    }
    return user;
  },
);