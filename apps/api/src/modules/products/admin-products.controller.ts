import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@deepa/shared';
import type { Request } from 'express';
import { Types } from 'mongoose';
import { CurrentUser, Permissions } from '../../common/decorators/auth.decorators.js';
import type { AuthenticatedUser } from '../../common/guards/auth.guard.js';
import { ApiException } from '../../common/exceptions/api.exception.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { requestMeta } from '../../common/utils/request-meta.js';
import { MediaService } from '../media/media.service.js';
import { AdminListProductsDto, CreateProductDto, UpdateProductDto } from './dto/product.dto.js';
import { ProductsService } from './products.service.js';

@ApiTags('admin catalogue')
@Controller('admin/products')
export class AdminProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly media: MediaService,
  ) {}

  @Get()
  @Permissions(PERMISSIONS.PRODUCT_READ)
  list(@Query() query: AdminListProductsDto) {
    return this.products.listAdmin(query);
  }

  @Post()
  @Permissions(PERMISSIONS.PRODUCT_CREATE)
  create(@Body() dto: CreateProductDto, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.products.create(dto, { id: actor.id, role: actor.role, ...requestMeta(req) });
  }

  @Get(':id')
  @Permissions(PERMISSIONS.PRODUCT_READ)
  detail(@Param('id', ParseObjectIdPipe) id: string) {
    return this.products.adminDetail(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.PRODUCT_UPDATE)
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.products.update(id, dto, { id: actor.id, role: actor.role, ...requestMeta(req) });
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.PRODUCT_DELETE)
  async remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.products.remove(id, { id: actor.id, role: actor.role, ...requestMeta(req) });
  }

  @Get(':id/media')
  @Permissions(PERMISSIONS.PRODUCT_READ)
  mediaByProduct(@Param('id', ParseObjectIdPipe) id: string) {
    return this.media.findByOwner('PRODUCT', id);
  }

  @Put(':id/media')
  @Permissions(PERMISSIONS.PRODUCT_UPDATE)
  reorderMedia(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: { mediaIds?: string[] },
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    if (!body.mediaIds || body.mediaIds.length === 0) {
      throw ApiException.badRequest('mediaIds must be a non-empty array');
    }
    if (!Types.ObjectId.isValid(id)) throw ApiException.badRequest('Invalid product id');
    return this.media.setOrder('PRODUCT', id, body.mediaIds, {
      id: actor.id,
      role: actor.role,
      ...requestMeta(req),
    });
  }

  @Delete(':id/media/:mediaId')
  @Permissions(PERMISSIONS.PRODUCT_UPDATE)
  async detachMedia(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('mediaId', ParseObjectIdPipe) mediaId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const owned = await this.media.findByOwner('PRODUCT', id);
    if (!owned.some((view) => view.id === mediaId)) {
      throw ApiException.notFound('Media is not attached to this product');
    }
    return this.media.update(mediaId, { status: 'HIDDEN' }, {
      id: actor.id,
      role: actor.role,
      ...requestMeta(req),
    });
  }
}