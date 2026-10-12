import { Injectable } from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception.js';
import { roundMoney } from '../../common/utils/money.js';

export interface ShippingQuote {
  method: 'FLAT_FREE_THRESHOLD';
  shipping: number;
  flatFee?: number;
  freeThreshold?: number;
}

/**
 * Server-authoritative shipping calculation foundation (Phase 7).
 *
 * Only the approved `FLAT_FREE_THRESHOLD` model is implemented: a flat fee
 * that drops to zero once the subtotal reaches the configured free-shipping
 * threshold. Values always come from the `settings` document — never from the
 * client and never hard-coded. Pincode/courier-based calculation is expected
 * to plug in here behind the same `ShippingQuote` boundary later.
 */
@Injectable()
export class ShippingCalculatorService {
  calculate(subtotalIn: number, config: { mode: string; flatFee?: number; freeThreshold?: number } | null): ShippingQuote {
    if (!config) {
      throw ApiException.badRequest('Shipping configuration is unavailable');
    }
    if (config.mode !== 'FLAT_FREE_THRESHOLD') {
      throw ApiException.badRequest('The configured shipping method is not supported yet');
    }
    if (typeof config.flatFee !== 'number' || config.flatFee < 0) {
      throw ApiException.badRequest('Shipping fee is not configured');
    }

    const subtotal = Math.max(0, subtotalIn);
    const flatFee = roundMoney(config.flatFee);
    const freeThreshold = config.freeThreshold;
    const freeShipping = subtotal > 0 && typeof freeThreshold === 'number' && subtotal >= freeThreshold;
    const shipping = freeShipping ? 0 : flatFee;

    return {
      method: 'FLAT_FREE_THRESHOLD',
      shipping,
      flatFee,
      ...(typeof freeThreshold === 'number' ? { freeThreshold } : {}),
    };
  }
}