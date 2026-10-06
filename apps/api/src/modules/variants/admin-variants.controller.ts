import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@deepa/shared';
import type { Request } from 'express';
import { CurrentUser, Permissions } from '../../common/decorators/auth.decorators.js';
import type { AuthenticatedUser } from '../../common/guards/auth.guard.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { requestMeta } from '../../common/utils/request-meta.js';
import {
  CreateVariantDto,
  CreateVariantOptionDto,
  UpdateVariantDto,
  UpdateVariantOptionDto,
} from './dto/variant.dto.js';
import { VariantOptionsService } from './variant-options.service.js';
import { VariantsService } from './variants.service.js';

@ApiTags('admin catalogue')
@Controller('admin/variants')
export class AdminVariantsController {
  constructor(private readonly variants: VariantsService) {}

  @Get()
  @Permissions(PERMISSIONS.VARIANT_READ)
  list(@Query('productId') productId?: string, @Query('active') active?: string) {
    return this.variants.list(productId || undefined, active === 'true' || active === '1');
  }

  @Post()
  @Permissions(PERMISSIONS.VARIANT_CREATE)
  create(
    @Body() dto: CreateVariantDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.variants.create(dto, { id: actor.id, role: actor.role, ...requestMeta(req) });
  }

  @Get(':id')
  @Permissions(PERMISSIONS.VARIANT_READ)
  async byId(@Param('id', ParseObjectIdPipe) id: string) {
    return this.variants.toView(await this.variants.getById(id));
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.VARIANT_UPDATE)
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateVariantDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.variants.update(id, dto, { id: actor.id, role: actor.role, ...requestMeta(req) });
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.VARIANT_DELETE)
  async remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.variants.remove(id, { id: actor.id, role: actor.role, ...requestMeta(req) });
  }
}

@ApiTags('admin catalogue')
@Controller('admin/options')
export class AdminOptionsController {
  constructor(private readonly options: VariantOptionsService) {}

  @Get()
  @Permissions(PERMISSIONS.VARIANT_READ)
  list(@Query('optionType') optionType?: string, @Query('active') active?: string) {
    return this.options.list(optionType || undefined, active === 'true' || active === '1');
  }

  @Post()
  @Permissions(PERMISSIONS.VARIANT_CREATE)
  create(
    @Body() dto: CreateVariantOptionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.options.create(dto, { id: actor.id, role: actor.role, ...requestMeta(req) });
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.VARIANT_UPDATE)
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateVariantOptionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.options.update(id, dto, { id: actor.id, role: actor.role, ...requestMeta(req) });
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.VARIANT_DELETE)
  async remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.options.remove(id, { id: actor.id, role: actor.role, ...requestMeta(req) });
  }
}