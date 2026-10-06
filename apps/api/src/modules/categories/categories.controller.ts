import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@deepa/shared';
import type { Request } from 'express';
import { CurrentUser, Permissions } from '../../common/decorators/auth.decorators.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../common/guards/auth.guard.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { requestMeta } from '../../common/utils/request-meta.js';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';

@ApiTags('catalogue')
@Controller('catalog/categories')
export class PublicCategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Public()
  @Get()
  list() {
    return this.categories.listActive();
  }

  @Public()
  @Get(':slug')
  async bySlug(@Param('slug') slug: string) {
    return this.categories.toView(await this.categories.getBySlug(slug, true));
  }
}

@ApiTags('admin catalogue')
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Post()
  @Permissions(PERMISSIONS.CATEGORY_CREATE)
  create(@Body() dto: CreateCategoryDto, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.categories.create(dto, { id: actor.id, role: actor.role, ...requestMeta(req) });
  }

  @Get()
  @Permissions(PERMISSIONS.CATEGORY_READ)
  list() {
    return this.categories.list();
  }

  @Get(':id')
  @Permissions(PERMISSIONS.CATEGORY_READ)
  async byId(@Param('id', ParseObjectIdPipe) id: string) {
    return this.categories.toView(await this.categories.getById(id));
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.CATEGORY_UPDATE)
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.categories.update(id, dto, { id: actor.id, role: actor.role, ...requestMeta(req) });
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.CATEGORY_DELETE)
  async remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.categories.remove(id, { id: actor.id, role: actor.role, ...requestMeta(req) });
  }
}