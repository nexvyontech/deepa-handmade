import { HttpStatus, Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ERROR_CODES } from '../../common/errors/error-codes.js';
import { ApiException } from '../../common/exceptions/api.exception.js';
import { roundMoney } from '../../common/utils/money.js';
import type { AuthenticatedUser } from '../../common/guards/auth.guard.js';
import { ShippingCalculatorService } from '../shipping/shipping-calculator.service.js';
import { SettingsService } from '../settings/settings.service.js';
import {
  CART_LINE_MAX_QTY,
  CART_MAX_LINES,
  SESSION_ID_PATTERN,
  type AddCartItemDto,
  type CartCustomDetailsDto,
} from './dto/cart.dto.js';

export const CART_SESSION_HEADER = 'x-cart-session';
export const GUEST_CART_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface CartIdentity {
  /** Authenticated customer id (ObjectId string). */
  ownerId?: string;
  /** Guest cart session id (UUID v4). */
  sessionId?: string;
}

export interface CartLineRef {
  product: { _id: Types.ObjectId; name?: { en: string; ta?: string }; slug?: string; sku?: string; status?: string };
  variant?: {
    _id: Types.ObjectId;
    productId: Types.ObjectId;
    variantSku?: string;
    optionValueIds: Types.ObjectId[];
    active?: boolean;
  };
  options: Array<{ optionType: string; value: { en: string; ta?: string }; hex?: string }>;
}

export interface CartItemView {
  id: string;
  productId: string;
  productName: { en: string; ta?: string } | null;
  productSlug: string | null;
  productSku: string | null;
  variantId?: string;
  variantSku?: string;
  options: CartLineRef['options'];
  customDetails?: CartCustomDetailsDto;
  qty: number;
  moq: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CartTotalsView {
  subtotal: number;
  discount: number;
  shipping: number;
  grandTotal: number;
  shippingStatus: 'CONFIGURED' | 'UNAVAILABLE';
  shippingMethod: 'FLAT_FREE_THRESHOLD';
}

export interface CartView {
  id: string;
  identity: 'GUEST' | 'CUSTOMER';
  items: CartItemView[];
  totals: CartTotalsView;
  couponCode: string | null;
  offerAppliedIds: string[];
  version: number;
  updatedAt?: Date;
}

export interface CartIssue {
  code: 'ITEM_UNAVAILABLE' | 'PRICE_CHANGED' | 'QUANTITY_BELOW_MOQ' | 'CART_EMPTY';
  itemId?: string;
  message: string;
}

export interface CartValidationResult {
  cart: CartView;
  issues: CartIssue[];
}

interface CartItemData {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  variantId?: Types.ObjectId;
  qty: number;
  moq: number;
  unitPrice: number;
  customDetails?: CartCustomDetailsDto;
}

interface CartTotalsData {
  subtotal: number;
  discount: number;
  shipping: number;
  grandTotal: number;
}

interface CartDoc {
  _id: Types.ObjectId;
  ownerId?: Types.ObjectId;
  sessionId?: string;
  items: CartItemData[];
  totals: CartTotalsData;
  couponCode?: string;
  offerAppliedIds?: Types.ObjectId[];
  version: number;
  expiresAt?: Date;
  updatedAt?: Date;
  save(): Promise<unknown>;
}

function isSessionId(value: unknown): value is string {
  return typeof value === 'string' && SESSION_ID_PATTERN.test(value);
}

function optionTypeLabel(type: string): string {
  return type === 'COLOR' ? 'color' : type === 'SIZE' ? 'size' : type === 'HANDLE' ? 'handle' : type.toLowerCase();
}

@Injectable()
export class CartService {
  constructor(
    private readonly shipping: ShippingCalculatorService,
    private readonly settings: SettingsService,
    @Optional()
    @InjectModel('Cart')
    private readonly cart: Model<any>,
    @Optional()
    @InjectModel('Product')
    private readonly product: Model<any>,
    @Optional()
    @InjectModel('ProductVariant')
    private readonly variant: Model<any>,
    @Optional()
    @InjectModel('VariantOption')
    private readonly option: Model<any>,
  ) {}

  private ensureReady(): void {
    if (!this.cart) {
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'Cart service is unavailable',
      );
    }
  }

  /**
   * Customer identity for cart operations. Authenticated callers are keyed by
   * owner; guests must present a valid cart session (UUID v4) header.
   */
  resolveIdentity(user: AuthenticatedUser | undefined, sessionHeader: unknown): CartIdentity {
    if (user?.id) {
      return { ownerId: user.id };
    }
    if (isSessionId(sessionHeader)) {
      return { sessionId: sessionHeader };
    }
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      ERROR_CODES.BAD_REQUEST,
      'A cart session is required. Please reload the store and try again.',
    );
  }

  private async findCart(identity: CartIdentity): Promise<CartDoc | null> {
    this.ensureReady();
    const query: Record<string, unknown> = identity.ownerId
      ? { ownerId: new Types.ObjectId(identity.ownerId) }
      : { sessionId: identity.sessionId };
    return (await this.cart.findOne(query)) as CartDoc | null;
  }

  private async getOrCreate(identity: CartIdentity): Promise<CartDoc> {
    this.ensureReady();
    const query: Record<string, unknown> = identity.ownerId
      ? { ownerId: new Types.ObjectId(identity.ownerId) }
      : { sessionId: identity.sessionId };
    const existing = await this.cart.findOne(query);
    if (existing) return existing as CartDoc;

    const doc: Record<string, unknown> = { items: [], version: 1 };
    if (identity.ownerId) {
      doc.ownerId = new Types.ObjectId(identity.ownerId);
    } else {
      doc.sessionId = identity.sessionId;
      doc.expiresAt = new Date(Date.now() + GUEST_CART_TTL_MS);
    }
    return (await this.cart.create(doc)) as CartDoc;
  }

  /** Current sellable price (base + variant delta) and MOQ of a line. */
  private async liveUnitPrice(
    productId: string,
    variantId?: string,
  ): Promise<{ unitPrice: number; moq: number } | null> {
    if (!Types.ObjectId.isValid(productId)) return null;
    const product = await this.product.findById(new Types.ObjectId(productId));
    if (!product) return null;
    if (product.status !== 'ACTIVE') return null;
    const basePrice = typeof product.basePrice === 'number' ? product.basePrice : 0;
    const moq = typeof product.moq === 'number' && product.moq >= 1 ? product.moq : 1;

    if (variantId) {
      if (!Types.ObjectId.isValid(variantId)) return null;
      const variant = await this.variant.findById(new Types.ObjectId(variantId));
      if (!variant) return null;
      if (String(variant.productId) !== String(product._id)) return null;
      if (variant.active === false) return null;
      const delta = typeof variant.priceDelta === 'number' ? variant.priceDelta : 0;
      return { unitPrice: roundMoney(basePrice + delta), moq };
    }
    return { unitPrice: roundMoney(basePrice), moq };
  }

  /** Refresh price snapshots and MOQs; drop lines whose product/variant is gone. */
  private async refreshItems(cart: CartDoc): Promise<{ issues: CartIssue[] }> {
    const issues: CartIssue[] = [];
    const kept: CartItemData[] = [];
    for (const item of cart.items) {
      const live = await this.liveUnitPrice(String(item.productId), item.variantId ? String(item.variantId) : undefined);
      if (!live) {
        issues.push({
          code: 'ITEM_UNAVAILABLE',
          itemId: String(item._id),
          message: 'An item in your cart is no longer available and was removed.',
        });
        continue;
      }
      if (live.moq !== item.moq || live.unitPrice !== item.unitPrice) {
        issues.push({
          code: 'PRICE_CHANGED',
          itemId: String(item._id),
          message: 'Prices in your cart were refreshed.',
        });
      }
      kept.push({ ...item, qty: item.qty, moq: live.moq, unitPrice: live.unitPrice });
    }
    cart.items = kept;
    return { issues };
  }

  private async refreshTotals(cart: CartDoc, opts: { bumpVersion?: boolean }): Promise<void> {
    const subtotal = roundMoney(cart.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0));

    let shipping = 0;
    try {
      shipping = this.shipping.calculate(subtotal, await this.settings.getShippingConfig()).shipping;
    } catch {
      shipping = 0;
    }

    cart.totals.subtotal = subtotal;
    cart.totals.discount = 0;
    cart.totals.shipping = shipping;
    cart.totals.grandTotal = roundMoney(subtotal - cart.totals.discount + shipping);
    if (opts.bumpVersion) cart.version = (cart.version ?? 1) + 1;
  }

  private async loadRefs(cart: CartDoc): Promise<Map<string, CartLineRef>> {
    const productIds = [...new Set(cart.items.map((item) => String(item.productId)))];
    const variantIds = [...new Set(cart.items.map((item) => (item.variantId ? String(item.variantId) : '')))].filter(Boolean);
    const refs = new Map<string, CartLineRef>();

    const products: Array<any> = productIds.length
      ? await this.product.find({ _id: { $in: productIds.map((id) => new Types.ObjectId(id)) } })
      : [];
    const productBy = new Map<string, any>(products.map((p) => [String(p._id), p]));
    for (const product of products) {
      refs.set(String(product._id), {
        product: {
          _id: product._id,
          ...(product.name ? { name: product.name } : {}),
          ...(product.slug ? { slug: product.slug } : {}),
          ...(product.sku ? { sku: product.sku } : {}),
          ...(product.status ? { status: product.status } : {}),
        },
        options: [],
      });
    }

    const variants: Array<any> = variantIds.length
      ? await this.variant.find({ _id: { $in: variantIds.map((id) => new Types.ObjectId(id)) } })
      : [];

    const optionIdSet = new Set<string>();
    for (const variant of variants) {
      for (const optionId of variant.optionValueIds ?? []) {
        optionIdSet.add(String(optionId));
      }
    }
    const optionDocs: Array<any> = optionIdSet.size
      ? await this.option.find({ _id: { $in: [...optionIdSet].map((id) => new Types.ObjectId(id)) } })
      : [];
    const optionBy = new Map<string, any>(optionDocs.map((o) => [String(o._id), o]));

    for (const variant of variants) {
      const product = productBy.get(String(variant.productId));
      const options: CartLineRef['options'] = (variant.optionValueIds ?? [])
        .map((id: Types.ObjectId) => optionBy.get(String(id)))
        .filter((o: unknown): o is NonNullable<typeof o> => Boolean(o))
        .map((o: { optionType?: string; value?: { en: string; ta?: string }; hex?: string }): CartLineRef['options'][number] => ({
          optionType: optionTypeLabel(o.optionType ?? ''),
          value: o.value ?? { en: '' },
          ...(o.hex ? { hex: o.hex } : {}),
        }));
      refs.set(String(variant._id), {
        product: {
          _id: variant.productId,
          ...(product?.name ? { name: product.name } : {}),
          ...(product?.slug ? { slug: product.slug } : {}),
          ...(product?.sku ? { sku: product.sku } : {}),
          ...(product?.status ? { status: product.status } : {}),
        },
        variant: {
          _id: variant._id,
          productId: variant.productId,
          ...(variant.variantSku ? { variantSku: variant.variantSku } : {}),
          optionValueIds: variant.optionValueIds ?? [],
          ...(variant.active !== undefined ? { active: variant.active } : {}),
        },
        options,
      });
    }
    return refs;
  }

  private async toView(
    cart: CartDoc,
    identityKind: 'GUEST' | 'CUSTOMER',
    save: boolean,
  ): Promise<CartView> {
    const shippingConfigured = await this.settingsShippingReady();
    const refs = await this.loadRefs(cart);

    const items: CartItemView[] = cart.items.map((item) => {
      const ref = item.variantId ? refs.get(String(item.variantId)) : refs.get(String(item.productId));
      const product = ref?.product ?? null;
      const variant = ref?.variant ?? null;
      return {
        id: String(item._id),
        productId: String(item.productId),
        productName: product?.name ?? null,
        productSlug: product?.slug ?? null,
        productSku: product?.sku ?? null,
        ...(item.variantId ? { variantId: String(item.variantId) } : {}),
        ...(variant?.variantSku ? { variantSku: variant.variantSku } : {}),
        options: ref?.options ?? [],
        ...(item.customDetails ? { customDetails: item.customDetails } : {}),
        qty: item.qty,
        moq: item.moq,
        unitPrice: item.unitPrice,
        lineTotal: roundMoney(item.unitPrice * item.qty),
      };
    });

    if (save) {
      await cart.save();
    }

    return {
      id: String(cart._id),
      identity: identityKind,
      items,
      totals: {
        subtotal: cart.totals.subtotal,
        discount: cart.totals.discount,
        shipping: cart.totals.shipping,
        grandTotal: cart.totals.grandTotal,
        shippingStatus: shippingConfigured ? 'CONFIGURED' : 'UNAVAILABLE',
        shippingMethod: 'FLAT_FREE_THRESHOLD',
      },
      couponCode: cart.couponCode ?? null,
      offerAppliedIds: (cart.offerAppliedIds ?? []).map(String),
      version: cart.version,
      ...(cart.updatedAt ? { updatedAt: cart.updatedAt } : {}),
    };
  }

  /** GET /cart — server-side revalidated view persisted only when lines are corrected. */
  async getDetailed(identity: CartIdentity): Promise<CartView> {
    const cart = await this.getOrCreate(identity);
    const { issues } = await this.refreshItems(cart);
    const changed = issues.some((issue) => issue.code !== 'PRICE_CHANGED');
    await this.refreshTotals(cart, { bumpVersion: changed });
    return this.toView(cart, identity.ownerId ? 'CUSTOMER' : 'GUEST', changed);
  }

  /**
   * Revalidated cart view, or null when no cart exists yet (used by checkout;
   * does not create an empty cart).
   */
  async findView(identity: CartIdentity): Promise<CartView | null> {
    const cart = await this.findCart(identity);
    if (!cart) return null;
    const { issues } = await this.refreshItems(cart);
    const changed = issues.some((issue) => issue.code !== 'PRICE_CHANGED');
    await this.refreshTotals(cart, { bumpVersion: changed });
    return this.toView(cart, identity.ownerId ? 'CUSTOMER' : 'GUEST', true);
  }

  /** POST /cart/items — add (or fold into an existing matching line). */
  async addItem(identity: CartIdentity, dto: AddCartItemDto): Promise<CartView> {
    const cart = await this.getOrCreate(identity);

    if (cart.items.length >= CART_MAX_LINES) {
      throw ApiException.badRequest(`Your cart can hold at most ${CART_MAX_LINES} different items.`);
    }

    const live = await this.liveUnitPrice(dto.productId, dto.variantId);
    if (!live) {
      throw ApiException.badRequest('This product or variant is not available for purchase.');
    }
    if (dto.qty < live.moq) {
      throw ApiException.badRequest(`The minimum order quantity for this product is ${live.moq}.`);
    }

    const existingLine = cart.items.find(
      (item) =>
        String(item.productId) === dto.productId &&
        (item.variantId ? String(item.variantId) : '') === (dto.variantId ?? ''),
    );

    if (existingLine) {
      const nextQty = existingLine.qty + dto.qty;
      if (nextQty > CART_LINE_MAX_QTY) {
        throw ApiException.badRequest(`You cannot add more than ${CART_LINE_MAX_QTY} of an item.`);
      }
      existingLine.qty = nextQty;
      existingLine.moq = live.moq;
      existingLine.unitPrice = live.unitPrice;
      if (dto.customDetails) existingLine.customDetails = dto.customDetails;
    } else {
      cart.items.push({
        _id: new Types.ObjectId(),
        productId: new Types.ObjectId(dto.productId),
        ...(dto.variantId ? { variantId: new Types.ObjectId(dto.variantId) } : {}),
        qty: dto.qty,
        moq: live.moq,
        unitPrice: live.unitPrice,
        ...(dto.customDetails ? { customDetails: dto.customDetails } : {}),
      });
    }

    await this.refreshTotals(cart, { bumpVersion: true });
    return this.toView(cart, identity.ownerId ? 'CUSTOMER' : 'GUEST', true);
  }

  /** PATCH /cart/items/:itemId — update the quantity of a line (MOQ enforced). */
  async updateItemQty(identity: CartIdentity, itemId: string, qty: number): Promise<CartView> {
    const cart = await this.getOrCreate(identity);
    const index = cart.items.findIndex((item) => String(item._id) === itemId);
    if (index < 0) throw ApiException.notFound('Cart item not found');

    const item = cart.items[index];
    const live = await this.liveUnitPrice(String(item.productId), item.variantId ? String(item.variantId) : undefined);
    if (!live) {
      cart.items.splice(index, 1);
    } else {
      if (qty < live.moq) {
        throw ApiException.badRequest(`The minimum order quantity for this product is ${live.moq}.`);
      }
      item.qty = qty;
      item.moq = live.moq;
      item.unitPrice = live.unitPrice;
    }

    await this.refreshTotals(cart, { bumpVersion: true });
    return this.toView(cart, identity.ownerId ? 'CUSTOMER' : 'GUEST', true);
  }

  /** DELETE /cart/items/:itemId — remove one line. */
  async removeItem(identity: CartIdentity, itemId: string): Promise<CartView> {
    const cart = await this.getOrCreate(identity);
    const index = cart.items.findIndex((item) => String(item._id) === itemId);
    if (index < 0) throw ApiException.notFound('Cart item not found');
    cart.items.splice(index, 1);
    await this.refreshTotals(cart, { bumpVersion: true });
    return this.toView(cart, identity.ownerId ? 'CUSTOMER' : 'GUEST', true);
  }

  /** DELETE /cart — remove every line. */
  async clear(identity: CartIdentity): Promise<CartView> {
    const cart = await this.getOrCreate(identity);
    cart.items = [];
    await this.refreshTotals(cart, { bumpVersion: true });
    return this.toView(cart, identity.ownerId ? 'CUSTOMER' : 'GUEST', true);
  }

  /** POST /cart/validate — persist revalidation (drop stale lines, refresh prices). */
  async validate(identity: CartIdentity): Promise<CartValidationResult> {
    const cart = await this.getOrCreate(identity);
    const { issues } = await this.refreshItems(cart);
    if (cart.items.length === 0 && issues.length === 0) {
      issues.push({ code: 'CART_EMPTY', message: 'Your cart is empty.' });
    }
    await this.refreshTotals(cart, { bumpVersion: true });
    const view = await this.toView(cart, identity.ownerId ? 'CUSTOMER' : 'GUEST', true);
    return { cart: view, issues };
  }

  /** POST /cart/merge — move a guest-session cart into a customer cart. */
  async mergeCart(ownerId: string, sessionId: string): Promise<CartView> {
    if (!isSessionId(sessionId)) {
      throw ApiException.badRequest('A valid cart session is required to merge.');
    }
    const guestCart = await this.cart.findOne({ sessionId });
    const ownerCart = await this.getOrCreate({ ownerId });

    if (guestCart && String(guestCart._id) !== String(ownerCart._id)) {
      for (const guestItem of guestCart.items as CartItemData[]) {
        const existing = (ownerCart.items as CartItemData[]).find(
          (item) =>
            String(item.productId) === String(guestItem.productId) &&
            (item.variantId ? String(item.variantId) : '') ===
              (guestItem.variantId ? String(guestItem.variantId) : ''),
        );
        if (existing) {
          existing.qty = Math.min(existing.qty + guestItem.qty, CART_LINE_MAX_QTY);
        } else {
          (ownerCart.items as CartItemData[]).push({ ...guestItem, _id: new Types.ObjectId() });
        }
      }
      await this.cart.deleteOne({ _id: guestCart._id });
      await this.refreshTotals(ownerCart, { bumpVersion: true });
    }

    return this.toView(ownerCart, 'CUSTOMER', true);
  }

  private async settingsShippingReady(): Promise<boolean> {
    try {
      this.shipping.calculate(0, await this.settings.getShippingConfig());
      return true;
    } catch {
      return false;
    }
  }
}