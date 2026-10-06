import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PRODUCT_MODEL, productSchema } from '../../database/schemas/index.js';
import { AuditModule } from '../audit/AuditModule.js';
import { CategoriesModule } from '../categories/CategoriesModule.js';
import { MediaModule } from '../media/MediaModule.js';
import { VariantsModule } from '../variants/VariantsModule.js';
import { AdminProductsController } from './admin-products.controller.js';
import { PublicProductsController } from './public-products.controller.js';
import { ProductsService } from './products.service.js';

const hasMongoUri = (): boolean => !!process.env.MONGODB_URI;

/**
 * Catalogue products (Phase 5). Product deletion is a soft archive
 * (`status = ARCHIVED`); price fields are governed by the pricing module.
 */
@Module({
  imports: [
    MediaModule,
    VariantsModule,
    CategoriesModule,
    AuditModule,
    ...(hasMongoUri()
      ? [MongooseModule.forFeature([{ name: PRODUCT_MODEL, schema: productSchema }])]
      : []),
  ],
  controllers: [PublicProductsController, AdminProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}