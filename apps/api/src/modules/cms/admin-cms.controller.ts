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
import { CmsService } from './cms.service.js';
import {
  CreateBannerDto,
  CreateCmsPageDto,
  PageStatusActionDto,
  UpdateBannerDto,
  UpdateCmsPageDto,
} from './dto/cms.dto.js';

function actorOf(req: Request, actor: AuthenticatedUser) {
  return { id: actor.id, role: actor.role, ...requestMeta(req) };
}

@ApiTags('admin cms')
@Controller('admin/cms')
export class AdminCmsController {
  constructor(private readonly cms: CmsService) {}

  @Get('pages')
  @Permissions(PERMISSIONS.CMS_READ)
  pages(@Query('status') status?: string) {
    return this.cms.listPages(status || undefined);
  }

  @Post('pages')
  @Permissions(PERMISSIONS.CMS_CREATE)
  createPage(
    @Body() dto: CreateCmsPageDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.cms.createPage(dto, actorOf(req, actor));
  }

  @Patch('pages/:id')
  @Permissions(PERMISSIONS.CMS_UPDATE)
  updatePage(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateCmsPageDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.cms.updatePage(id, dto, actorOf(req, actor));
  }

  @Patch('pages/:id/status')
  @Permissions(PERMISSIONS.CMS_PUBLISH)
  pageStatus(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: PageStatusActionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.cms.setPageStatus(id, dto.action, actorOf(req, actor));
  }

  @Delete('pages/:id')
  @Permissions(PERMISSIONS.CMS_DELETE)
  async removePage(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.cms.removePage(id, actorOf(req, actor));
  }

  @Get('banners')
  @Permissions(PERMISSIONS.CMS_READ)
  banners() {
    return this.cms.listBanners();
  }
}

@ApiTags('admin cms')
@Controller('admin/banners')
export class AdminBannersController {
  constructor(private readonly cms: CmsService) {}

  @Get()
  @Permissions(PERMISSIONS.CMS_READ)
  banners() {
    return this.cms.listBanners();
  }

  @Post()
  @Permissions(PERMISSIONS.CMS_CREATE)
  create(
    @Body() dto: CreateBannerDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.cms.createBanner(dto, actorOf(req, actor));
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.CMS_UPDATE)
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateBannerDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.cms.updateBanner(id, dto, actorOf(req, actor));
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.CMS_DELETE)
  async remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.cms.removeBanner(id, actorOf(req, actor));
  }
}