import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception.js';
import { ERROR_CODES } from '../../common/errors/error-codes.js';
import type { AuthenticatedUser } from '../../common/guards/auth.guard.js';
import { AddressesService, type AddressView } from '../addresses/addresses.service.js';
import { CartService, type CartIdentity, type CartIssue, type CartView } from '../cart/cart.service.js';
import { ShippingCalculatorService, type ShippingQuote } from '../shipping/shipping-calculator.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { CheckoutPrepareDto, CheckoutInlineAddressDto } from './dto/checkout.dto.js';

export interface CheckoutAddressSnapshot {
  addressId?: string;
  recipient: string;
  mobile: string;
  line1: string;
  line2?: string;
  villageTown: string;
  district: string;
  state: string;
  pincode: string;
  landmark?: string;
  label?: string;
}

export interface CheckoutOrderSummary {
  subtotal: number;
  discount: number;
  shipping: number;
  grandTotal: number;
}

export interface CheckoutPreparation {
  valid: boolean;
  issues: CartIssue[];
  cart: CartView;
  address: CheckoutAddressSnapshot;
  shipping: ShippingQuote;
  summary: CheckoutOrderSummary;
}

/**
 * Checkout preparation (Phase 7). Delivers a validated cart + delivery address
 * + server-calculated order summary. It never persists an order or a payment —
 * order creation and payment selection arrive with the next phase.
 */
@Injectable()
export class CheckoutService {
  constructor(
    private readonly cart: CartService,
    private readonly addresses: AddressesService,
    private readonly shipping: ShippingCalculatorService,
    private readonly settings: SettingsService,
  ) {}

  /** Resolve the identity used by the customer's active cart. */
  resolveIdentity(user: AuthenticatedUser | undefined, session: string | undefined): CartIdentity {
    if (user?.id) {
      return { ownerId: user.id };
    }
    if (session) {
      return { sessionId: session };
    }
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      ERROR_CODES.BAD_REQUEST,
      'A cart session is required. Please reload the store and try again.',
    );
  }

  async prepare(identity: CartIdentity, dto: CheckoutPrepareDto): Promise<CheckoutPreparation> {
    const cart = await this.cart.findView(identity);
    if (!cart || cart.items.length === 0) {
      throw ApiException.badRequest('Your cart is empty. Add items before checkout.');
    }
    const issues: CartIssue[] = [];

    const address = await this.resolveAddress(identity, dto);
    const config = await this.settings.getShippingConfig();
    const quote = this.shipping.calculate(cart.totals.subtotal, config);

    const summary: CheckoutOrderSummary = {
      subtotal: cart.totals.subtotal,
      discount: cart.totals.discount,
      shipping: quote.shipping,
      grandTotal: cart.totals.grandTotal,
    };

    return {
      valid: issues.length === 0,
      issues,
      cart,
      address,
      shipping: quote,
      summary,
    };
  }

  private async resolveAddress(
    identity: CartIdentity,
    dto: CheckoutPrepareDto,
  ): Promise<CheckoutAddressSnapshot> {
    if (dto.addressId) {
      if (!identity.ownerId) {
        throw ApiException.badRequest('Sign in to use a saved delivery address.');
      }
      const saved: AddressView = await this.addresses.getView(identity.ownerId, dto.addressId);
      return this.fromSavedAddress(saved);
    }
    if (dto.address) {
      return this.fromInlineAddress(dto.address);
    }
    throw ApiException.badRequest('A delivery address is required.');
  }

  private fromSavedAddress(address: AddressView): CheckoutAddressSnapshot {
    return {
      ...(address.id ? { addressId: String(address.id) } : {}),
      recipient: address.recipient,
      mobile: address.mobile,
      line1: address.line1,
      ...(address.line2 ? { line2: address.line2 } : {}),
      villageTown: address.villageTown,
      district: address.district,
      state: address.state,
      pincode: address.pincode,
      ...(address.landmark ? { landmark: address.landmark } : {}),
      ...(address.label ? { label: address.label } : {}),
    };
  }

  private fromInlineAddress(address: CheckoutInlineAddressDto): CheckoutAddressSnapshot {
    return {
      recipient: address.recipient.trim(),
      mobile: address.mobile.trim(),
      line1: address.line1.trim(),
      ...(address.line2 ? { line2: address.line2.trim() } : {}),
      villageTown: address.villageTown.trim(),
      district: address.district.trim(),
      state: address.state.trim(),
      pincode: address.pincode.trim(),
      ...(address.landmark ? { landmark: address.landmark.trim() } : {}),
      ...(address.label ? { label: address.label.trim() } : {}),
    };
  }
}