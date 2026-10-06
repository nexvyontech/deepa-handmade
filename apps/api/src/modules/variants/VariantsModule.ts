import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PRODUCT_MODEL,
  productSchema,
  PRODUCT_VARIANT_MODEL,
  productVariantSchema,
  VARIANT_OPTION_MODEL,
  variantOptionSchema,
} from '../../database/schemas/index.js';
import { AuditModule } from '../audit/AuditModule.js';
import { MediaModule } from '../media/MediaModule.js';
import { AdminOptionsController, AdminVariantsController } from './admin-variants.controller.js';
import { VariantOptionsService } from './variant-options.service.js';
import { VariantsService } from './variants.service.js';

const hasMongoUri = (): boolean => !!process.env.MONGODB_URI;

/**
 * Variants and variant options (Phase 5). Variant deletion is a soft
 * `active:false` (order snapshots may reference variants later); options are
 * also soft-deactivated.
 */
@Module({
  imports: [
    MediaModule,
    AuditModule,
    ...(hasMongoUri()
      ? [
          MongooseModule.forFeature([
            { name: PRODUCT_VARIANT_MODEL, schema: productVariantSchema },
            { name: VARIANT_OPTION_MODEL, schema: variantOptionSchema },
            { name: PRODUCT_MODEL, schema: productSchema },
          ]),
        ]
      : []),
  ],
  controllers: [AdminVariantsController, AdminOptionsController],
  providers: [VariantsService, VariantOptionsService],
  exports: [VariantsService, VariantOptionsService],
})
export class VariantsModule {}