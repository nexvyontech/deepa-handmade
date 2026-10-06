import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PRODUCT_MODEL, productSchema } from '../../database/schemas/index.js';
import { AuditModule } from '../audit/AuditModule.js';
import { AdminPricingController } from './admin-pricing.controller.js';
import { PricingService } from './pricing.service.js';

const hasMongoUri = (): boolean => !!process.env.MONGODB_URI;

/**
 * Pricing foundation (Phase 5). Price fields live on the product document and
 * are ONLY mutated through this module; every change is audited PRICE_CHANGED.
 */
@Module({
  imports: [
    AuditModule,
    ...(hasMongoUri()
      ? [MongooseModule.forFeature([{ name: PRODUCT_MODEL, schema: productSchema }])]
      : []),
  ],
  controllers: [AdminPricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}