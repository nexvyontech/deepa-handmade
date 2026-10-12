import { Module } from '@nestjs/common';
import { AddressesModule } from '../addresses/AddressesModule.js';
import { AuthModule } from '../auth/AuthModule.js';
import { CartModule } from '../cart/CartModule.js';
import { SettingsModule } from '../settings/SettingsModule.js';
import { ShippingModule } from '../shipping/ShippingModule.js';
import { CheckoutController } from './checkout.controller.js';
import { CheckoutService } from './checkout.service.js';

/**
 * Checkout preparation (Phase 7) - validates cart + delivery address and
 * returns a server-calculated order summary. Order creation is intentionally
 * out of scope for this phase.
 */
@Module({
  imports: [AuthModule, CartModule, AddressesModule, ShippingModule, SettingsModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}