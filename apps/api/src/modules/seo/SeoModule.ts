import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CATEGORY_MODEL,
  categorySchema,
  CMS_PAGE_MODEL,
  cmsPageSchema,
  PRODUCT_MODEL,
  productSchema,
} from '../../database/schemas/index.js';
import { AuditModule } from '../audit/AuditModule.js';
import { AdminSeoController } from './admin-seo.controller.js';
import { SeoService } from './seo.service.js';

const hasMongoUri = (): boolean => !!process.env.MONGODB_URI;

/** SEO metadata for products, categories and CMS pages (Phase 5). */
@Module({
  imports: [
    AuditModule,
    ...(hasMongoUri()
      ? [
          MongooseModule.forFeature([
            { name: PRODUCT_MODEL, schema: productSchema },
            { name: CATEGORY_MODEL, schema: categorySchema },
            { name: CMS_PAGE_MODEL, schema: cmsPageSchema },
          ]),
        ]
      : []),
  ],
  controllers: [AdminSeoController],
  providers: [SeoService],
  exports: [SeoService],
})
export class SeoModule {}