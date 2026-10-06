import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StorageModule } from '../../common/storage/storage.module.js';
import {
  BANNER_MODEL,
  bannerSchema,
  CATEGORY_MODEL,
  categorySchema,
  CMS_PAGE_MODEL,
  cmsPageSchema,
  MEDIA_MODEL,
  mediaSchema,
  PRODUCT_MODEL,
  productSchema,
  PRODUCT_VARIANT_MODEL,
  productVariantSchema,
} from '../../database/schemas/index.js';
import { AuditModule } from '../audit/AuditModule.js';
import { AuthModule } from '../auth/AuthModule.js';
import { MediaController } from './media.controller.js';
import { MediaService } from './media.service.js';

const hasMongoUri = (): boolean => !!process.env.MONGODB_URI;

/**
 * Media module (Phase 5): upload validation, storage abstraction, secure
 * content serving and metadata CRUD. Also assembles storefront media URLs for
 * products, categories, variants, banners and CMS pages.
 */
@Module({
  imports: [
    StorageModule,
    AuthModule,
    AuditModule,
    ...(hasMongoUri()
      ? [
          MongooseModule.forFeature([
            { name: MEDIA_MODEL, schema: mediaSchema },
            { name: CATEGORY_MODEL, schema: categorySchema },
            { name: PRODUCT_MODEL, schema: productSchema },
            { name: PRODUCT_VARIANT_MODEL, schema: productVariantSchema },
            { name: CMS_PAGE_MODEL, schema: cmsPageSchema },
            { name: BANNER_MODEL, schema: bannerSchema },
          ]),
        ]
      : []),
  ],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}