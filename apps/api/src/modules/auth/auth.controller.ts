import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PERMISSIONS, ROLES } from '@deepa/shared';
import type { Request } from 'express';
import type { RefreshSessionView } from '../../common/auth/refresh-session.service.js';
import { CurrentUser, Permissions } from '../../common/decorators/auth.decorators.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../common/guards/auth.guard.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import {
  AuthService,
  type AuthResponse,
  type PasswordResetRequestResponse,
  type PublicUser,
  type RequestMeta,
} from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { PasswordResetConfirmDto, PasswordResetRequestDto } from './dto/password-reset.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { RegisterDto } from './dto/register.dto.js';

function requestMeta(req: Request): RequestMeta {
  return { ip: req.ip, userAgent: req.headers['user-agent'] };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request): Promise<AuthResponse> {
    return this.auth.register(dto, requestMeta(req));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponse> {
    return this.auth.login(dto, requestMeta(req));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto, @Req() req: Request): Promise<AuthResponse> {
    return this.auth.refresh(dto, requestMeta(req));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentUser() actor: AuthenticatedUser, @Req() req: Request): Promise<void> {
    return this.auth.logout(actor, requestMeta(req));
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  logoutAll(@CurrentUser() actor: AuthenticatedUser, @Req() req: Request): Promise<void> {
    return this.auth.logoutAll(actor, requestMeta(req));
  }

  @Get('me')
  me(@CurrentUser() actor: AuthenticatedUser): Promise<PublicUser> {
    return this.auth.me(actor);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<void> {
    return this.auth.changePassword(actor, dto, requestMeta(req));
  }

  @Public()
  @Post('password-reset/request')
  @HttpCode(HttpStatus.ACCEPTED)
  requestPasswordReset(
    @Body() dto: PasswordResetRequestDto,
    @Req() req: Request,
  ): Promise<PasswordResetRequestResponse> {
    return this.auth.requestPasswordReset(dto, requestMeta(req));
  }

  @Public()
  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  confirmPasswordReset(
    @Body() dto: PasswordResetConfirmDto,
    @Req() req: Request,
  ): Promise<void> {
    return this.auth.confirmPasswordReset(dto, requestMeta(req));
  }

  @Get('sessions')
  listSessions(@CurrentUser() actor: AuthenticatedUser): Promise<RefreshSessionView[]> {
    return this.auth.listSessions(actor);
  }

  @Post('admin/users/:userId/revoke-sessions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN)
  revokeUserSessions(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<void> {
    return this.auth.revokeUserSessions(userId, actor, requestMeta(req));
  }

  @Get('admin/users/:userId/sessions')
  @Permissions(PERMISSIONS.STAFF_MANAGE)
  listUserSessions(
    @Param('userId', ParseObjectIdPipe) userId: string,
  ): Promise<RefreshSessionView[]> {
    return this.auth.listUserSessions(userId);
  }
}
