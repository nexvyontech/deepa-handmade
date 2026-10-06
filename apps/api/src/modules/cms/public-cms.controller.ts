import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { CmsService } from './cms.service.js';

@ApiTags('public cms')
@Controller('cms')
export class PublicCmsController {
  constructor(private readonly cms: CmsService) {}

  @Get('pages')
  @Public()
  pages() {
    return this.cms.listPages('PUBLISHED');
  }

  @Get('pages/:slug')
  @Public()
  page(@Param('slug') slug: string) {
    return this.cms.getPublishedBySlug(slug);
  }

  @Get('banners')
  @Public()
  banners() {
    return this.cms.listActiveBanners();
  }
}