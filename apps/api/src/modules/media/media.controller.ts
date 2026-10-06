import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@deepa/shared';
import type { Request, Response } from 'express';
import { AccessTokenService } from '../../common/auth/token.service.js';
import { ERROR_CODES } from '../../common/errors/error-codes.js';
import { ApiException } from '../../common/exceptions/api.exception.js';
import type { AuthenticatedUser } from '../../common/guards/auth.guard.js';
import { CurrentUser, Permissions } from '../../common/decorators/auth.decorators.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { requestMeta } from '../../common/utils/request-meta.js';
import { ListMediaDto, UpdateMediaDto, UploadMediaFieldsDto } from './dto/media.dto.js';
import { MediaService } from './media.service.js';
import type { UploadFile } from './media-validation.js';

function uploadFileLimit(): number {
  const megabytes = Number(process.env.MEDIA_MAX_VIDEO_MB || 100);
  const safe = Number.isFinite(megabytes) && megabytes > 0 ? megabytes : 100;
  return safe * 1024 * 1024;
}

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly tokens: AccessTokenService,
  ) {}

  @Post('upload')
  @Permissions(PERMISSIONS.MEDIA_UPLOAD)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: uploadFileLimit(), files: 1 } }),
  )
  upload(
    @UploadedFile() file: UploadFile | undefined,
    @Body() fields: UploadMediaFieldsDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.media.upload(
      fields.ownerType,
      fields.ownerId,
      file,
      { bucket: fields.bucket, isPrimary: fields.isPrimary, sortOrder: fields.sortOrder },
      { id: actor.id, role: actor.role, ...requestMeta(req) },
    );
  }

  @Get()
  @Permissions(PERMISSIONS.MEDIA_READ)
  list(@Query() query: ListMediaDto) {
    return this.media.list({
      ownerType: query.ownerType,
      ownerId: query.ownerId,
      status: query.status,
      bucket: query.bucket,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id')
  @Permissions(PERMISSIONS.MEDIA_READ)
  async get(@Param('id', ParseObjectIdPipe) id: string) {
    return this.media.toView(await this.media.getById(id));
  }

  @Get(':id/content')
  @Public()
  async content(
    @Param('id', ParseObjectIdPipe) id: string,
    @Headers('authorization') authorization: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const actor = this.resolveBearerActor(authorization);
    const { redirectUrl, stream, mime } = await this.media.getContent(id, actor);

    if (redirectUrl) {
      res.redirect(HttpStatus.FOUND, redirectUrl);
      return;
    }
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (!stream) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.ENTITY_NOT_FOUND,
        'Media content is unavailable',
      );
    }
    stream.pipe(res);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.MEDIA_UPDATE)
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateMediaDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.media.update(id, dto, {
      id: actor.id,
      role: actor.role,
      ...requestMeta(req),
    });
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.MEDIA_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<void> {
    await this.media.remove(id, { id: actor.id, role: actor.role, ...requestMeta(req) });
  }

  private resolveBearerActor(authorization: string | undefined): {
    id: string;
    permissions: string[];
  } | null {
    if (!authorization) return null;
    const [scheme, token] = authorization.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
    try {
      const payload = this.tokens.verify(token);
      return { id: payload.sub, permissions: payload.permissions ?? [] };
    } catch {
      return null;
    }
  }
}