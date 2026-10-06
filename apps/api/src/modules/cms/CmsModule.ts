import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BANNER_MODEL, bannerSchema, CMS_PAGE_MODEL, cmsPageSchema } from '../../database/schemas/index.js';
import { AuditModule } from '../audit/AuditModule.js';
import { MediaModule } from '../media/MediaModule.js';
import { AdminBannersController, AdminCmsController } from './admin-cms.controller.js';
import { CmsService } from './cms.service.js';
import { PublicCmsController } from './public-cms.controller.js';

const hasMongoUri = (): boolean => !!process.env.MONGODB_URI;

/**
 * CMS (Phase 5): informational pages (PAGE/POLICY/CONTACT/FAQ) with publish
 * workflow and time-boxed homepage banners. Page/banner deletion is soft.
 */
@Module({
  imports: [
    MediaModule,
    AuditModule,
    ...(hasMongoUri()
      ? [
          MongooseModule.forFeature([
            { name: CMS_PAGE_MODEL, schema: cmsPageSchema },
            { name: BANNER_MODEL, schema: bannerSchema },
          ]),
        ]
      : []),
  ],
  controllers: [PublicCmsController, AdminCmsController, AdminBannersController],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}