import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CART_MODEL,
  cartSchema,
  PRODUCT_MODEL,
  productSchema,
  PRODUCT_VARIANT_MODEL,
  productVariantSchema,
  VARIANT_OPTION_MODEL,
  variantOptionSchema,
} from '../../database/schemas/index.js';
import { ShippingModule } from '../shipping/ShippingModule.js';
import { SettingsModule } from '../settings/SettingsModule.js';
import { AuthModule } from '../auth/AuthModule.js';
import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';

const hasMongoUri = (): boolean => !!process.env.MONGODB_URI;

/**
 * Customer cart (Phase 7): add/update/remove/clear, guest sessions, merge into
 * a signed-in cart, and server-authoritative validation/price recalculation.
 */
@Module({
  imports: [
    AuthModule,
    ShippingModule,
    SettingsModule,
    ...(hasMongoUri()
      ? [
          MongooseModule.forFeature([
            { name: CART_MODEL, schema: cartSchema },
            { name: PRODUCT_MODEL, schema: productSchema },
            { name: PRODUCT_VARIANT_MODEL, schema: productVariantSchema },
            { name: VARIANT_OPTION_MODEL, schema: variantOptionSchema },
          ]),
        ]
      : []),
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}