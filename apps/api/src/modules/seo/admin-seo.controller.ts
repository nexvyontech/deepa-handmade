import { Body, Controller, Get, Param, Put, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@deepa/shared';
import type { Request } from 'express';
import { CurrentUser, Permissions } from '../../common/decorators/auth.decorators.js';
import type { AuthenticatedUser } from '../../common/guards/auth.guard.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { ApiException } from '../../common/exceptions/api.exception.js';
import { SeoDto } from '../categories/dto/category.dto.js';
import { SeoService, SeoEntityType } from './seo.service.js';

@ApiTags('admin seo')
@Controller('admin/seo')
export class AdminSeoController {
  constructor(private readonly seo: SeoService) {}

  private parseType(type: string): SeoEntityType {
    if (type === 'product' || type === 'category' || type === 'page') return type;
    throw ApiException.badRequest(`Invalid SEO entity type "${type}" (expected product, category or page)`);
  }

  @Get(':entityType/:entityId')
  @Permissions(PERMISSIONS.SEO_READ)
  get(@Param('entityType') entityType: string, @Param('entityId', ParseObjectIdPipe) entityId: string) {
    return this.seo.get(this.parseType(entityType), entityId);
  }

  @Put(':entityType/:entityId')
  @Permissions(PERMISSIONS.SEO_UPDATE)
  update(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseObjectIdPipe) entityId: string,
    @Body() dto: SeoDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.seo.update(this.parseType(entityType), entityId, dto, {
      id: actor.id,
      role: actor.role,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}