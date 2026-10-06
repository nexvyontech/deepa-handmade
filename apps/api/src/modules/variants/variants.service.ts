import { createHash } from 'node:crypto';
import { HttpStatus, Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditService } from '../../common/auth/audit.service.js';
import { ERROR_CODES } from '../../common/errors/error-codes.js';
import { ApiException } from '../../common/exceptions/api.exception.js';
import { effectivePrice } from '../../common/utils/money.js';
import { MediaService } from '../media/media.service.js';
import { CreateVariantDto, UpdateVariantDto } from './dto/variant.dto.js';
import {
  VariantOptionDoc,
  VariantOptionsService,
  type VariantOptionView,
} from './variant-options.service.js';

export interface VariantDoc {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  optionValueIds: Types.ObjectId[];
  comboHash: string;
  variantSku?: string;
  priceDelta: number;
  stockMode: 'INVENTORY_TRACKED' | 'AVAILABLE_ONLY';
  active: boolean;
  imageMediaIds: Types.ObjectId[];
  isCustomColor: boolean;
  isCustomSize: boolean;
  createdAt: Date;
}

export interface VariantView {
  id: string;
  productId: string;
  optionValueIds: string[];
  options: VariantOptionView[];
  comboHash: string;
  variantSku?: string;
  priceDelta: number;
  effectivePrice?: number;
  stockMode: 'INVENTORY_TRACKED' | 'AVAILABLE_ONLY';
  active: boolean;
  imageMediaIds: string[];
  images: Array<{ id: string; url: string }>;
  isCustomColor: boolean;
  isCustomSize: boolean;
  createdAt?: Date;
}

export interface ActorContext {
  id: string;
  role: string;
  ip?: string;
  userAgent?: string;
}

/** Deterministic fingerprint of a sorted option-value set (per product unique). */
export function comboHashFor(optionValueIds: string[]): string {
  const joined = [...optionValueIds].sort().join('|');
  return createHash('sha1').update(joined).digest('hex');
}

function isDuplicateKey(error: unknown): boolean {
  return (error as { code?: number } | undefined)?.code === 11000;
}

@Injectable()
export class VariantsService {
  constructor(
    private readonly audit: AuditService,
    private readonly media: MediaService,
    private readonly options: VariantOptionsService,
    @Optional()
    @InjectModel('ProductVariant')
    private readonly variant: Model<any>,
    @Optional()
    @InjectModel('Product')
    private readonly product: Model<any>,
  ) {}

  private ensureReady(): void {
    if (!this.variant || !this.product) {
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'Variants service is unavailable',
      );
    }
  }

  private async resolveOptions(ids: string[]): Promise<VariantOptionDoc[]> {
    if (ids.length === 0) return [];
    const objectIds = ids.map((id) => new Types.ObjectId(id));
    const docs = await this.options.findByIdsActive(objectIds);
    if (docs.length !== objectIds.length) {
      throw ApiException.badRequest('One or more option values are unknown or inactive');
    }
    return docs;
  }

  async create(dto: CreateVariantDto, actor: ActorContext): Promise<VariantView> {
    this.ensureReady();
    const product = await this.product.findById(new Types.ObjectId(dto.productId));
    if (!product) throw ApiException.badRequest('Product does not exist');

    const optionValueIds = dto.optionValueIds ?? [];
    await this.resolveOptions(optionValueIds);
    const hash = comboHashFor(optionValueIds);

    const skuPrefix = product.sku.trim().toUpperCase();
    const variantSku = dto.variantSku ? dto.variantSku.trim() : `${skuPrefix}-${hash.slice(0, 6).toUpperCase()}`;

    try {
      const created = await this.variant.create({
        productId: new Types.ObjectId(dto.productId),
        optionValueIds: optionValueIds.map((id) => new Types.ObjectId(id)),
        comboHash: hash,
        variantSku,
        ...(dto.priceDelta !== undefined ? { priceDelta: dto.priceDelta } : {}),
        ...(dto.stockMode !== undefined ? { stockMode: dto.stockMode } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.imageMediaIds ? { imageMediaIds: dto.imageMediaIds.map((id) => new Types.ObjectId(id)) } : {}),
        ...(dto.isCustomColor !== undefined ? { isCustomColor: dto.isCustomColor } : {}),
        ...(dto.isCustomSize !== undefined ? { isCustomSize: dto.isCustomSize } : {}),
      });
      await this.audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: 'VARIANT_CREATED',
        entityType: 'product-variant',
        entityId: String(created._id),
        after: { productId: dto.productId, comboHash: hash, variantSku },
        meta: { ip: actor.ip, userAgent: actor.userAgent },
      });
      return this.toView(created, await this.loadOptions(created.optionValueIds), product.basePrice);
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw ApiException.conflict(
          'A variant with this combination (or SKU) already exists for the product',
        );
      }
      throw error;
    }
  }

  private async loadOptions(ids: Types.ObjectId[]): Promise<VariantOptionDoc[]> {
    if (ids.length === 0) return [];
    return this.options.findByIdsActive(ids);
  }

  async update(id: string, dto: UpdateVariantDto, actor: ActorContext): Promise<VariantView> {
    this.ensureReady();
    const variant = await this.getById(id);

    let nextHash = variant.comboHash;
    if (dto.optionValueIds) {
      await this.resolveOptions(dto.optionValueIds);
      nextHash = comboHashFor(dto.optionValueIds);
    }

    const before = {
      optionValueIds: variant.optionValueIds.map(String),
      comboHash: variant.comboHash,
      variantSku: variant.variantSku,
      priceDelta: variant.priceDelta,
      stockMode: variant.stockMode,
      active: variant.active,
    };

    const patch: Record<string, unknown> = {};
    if (dto.optionValueIds) {
      patch.optionValueIds = dto.optionValueIds.map((id) => new Types.ObjectId(id));
      patch.comboHash = nextHash;
    }
    if (dto.variantSku !== undefined) patch.variantSku = dto.variantSku.trim();
    if (dto.priceDelta !== undefined) patch.priceDelta = dto.priceDelta;
    if (dto.stockMode !== undefined) patch.stockMode = dto.stockMode;
    if (dto.active !== undefined) patch.active = dto.active;
    if (dto.imageMediaIds !== undefined) {
      patch.imageMediaIds = dto.imageMediaIds.map((id) => new Types.ObjectId(id));
    }
    if (dto.isCustomColor !== undefined) patch.isCustomColor = dto.isCustomColor;
    if (dto.isCustomSize !== undefined) patch.isCustomSize = dto.isCustomSize;

    try {
      Object.assign(variant, patch);
      await variant.save();
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw ApiException.conflict(
          'A variant with this combination (or SKU) already exists for the product',
        );
      }
      throw error;
    }

    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'VARIANT_UPDATED',
      entityType: 'product-variant',
      entityId: id,
      before,
      after: {
        optionValueIds: variant.optionValueIds.map(String),
        comboHash: variant.comboHash,
        variantSku: variant.variantSku,
        priceDelta: variant.priceDelta,
        active: variant.active,
      },
      meta: { ip: actor.ip, userAgent: actor.userAgent },
    });
    return this.toView(variant, await this.loadOptions(variant.optionValueIds));
  }

  async remove(id: string, actor: ActorContext): Promise<VariantView> {
    this.ensureReady();
    const variant = await this.getById(id);
    if (!variant.active) return this.toView(variant, await this.loadOptions(variant.optionValueIds));
    variant.active = false;
    await variant.save();
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'VARIANT_DELETED',
      entityType: 'product-variant',
      entityId: id,
      before: { active: true },
      after: { active: false },
      meta: { ip: actor.ip, userAgent: actor.userAgent },
    });
    return this.toView(variant, await this.loadOptions(variant.optionValueIds));
  }

  async getById(id: string): Promise<any> {
    this.ensureReady();
    if (!Types.ObjectId.isValid(id)) throw ApiException.notFound('Variant not found');
    const doc = await this.variant.findById(new Types.ObjectId(id));
    if (!doc) throw ApiException.notFound('Variant not found');
    return doc;
  }

  async list(productId?: string, activeOnly = false): Promise<VariantView[]> {
    this.ensureReady();
    const query: Record<string, unknown> = {};
    if (productId) {
      if (!Types.ObjectId.isValid(productId)) throw ApiException.badRequest('productId must be a valid ObjectId');
      query.productId = new Types.ObjectId(productId);
    }
    if (activeOnly) query.active = true;
    const docs = await this.variant.find(query).sort({ createdAt: 1 });
    return Promise.all(docs.map(async (doc) => this.toView(doc, await this.loadOptions(doc.optionValueIds))));
  }

  /** Variants of a product (used by product detail and the public variants route). */
  getByProduct(productId: string, activeOnly = false): Promise<VariantView[]> {
    return this.list(productId, activeOnly);
  }

  /** Product ids that carry at least one variant matching every option filter. */
  async productIdsForOptionFilters(
    filters: Array<{ optionType: string; value: string }>,
  ): Promise<string[]> {
    this.ensureReady();
    if (filters.length === 0) return [];

    const optionQuery: Record<string, unknown>[] = [];
    for (const filter of filters) {
      const options = await this.options.findByIdsForValue(filter.optionType, filter.value);
      if (options.length === 0) return [];
      optionQuery.push({ optionValueIds: { $in: options.map((option) => option._id) } });
    }

    const matches = await this.variant.distinct('productId', { $and: optionQuery });
    return matches.map((id) => String(id));
  }

  async toView(
    variant: VariantDoc,
    optionsIn?: VariantOptionDoc[],
    basePriceIn?: number,
  ): Promise<VariantView> {
    const options = optionsIn ?? (await this.loadOptions(variant.optionValueIds));
    const byId = new Map(options.map((option) => [String(option._id), option]));
    const media = await this.media.findByIds(variant.imageMediaIds.map(String));

    const basePrice =
      basePriceIn ?? (await this.product?.findById(variant.productId))?.basePrice;

    return {
      id: String(variant._id),
      productId: String(variant.productId),
      optionValueIds: variant.optionValueIds.map(String),
      options: variant.optionValueIds
        .map((id) => byId.get(String(id)))
        .filter((option): option is VariantOptionDoc => Boolean(option))
        .map((option) => this.options.toView(option)),
      comboHash: variant.comboHash,
      ...(variant.variantSku ? { variantSku: variant.variantSku } : {}),
      priceDelta: variant.priceDelta,
      ...(basePrice !== undefined ? { effectivePrice: effectivePrice(basePrice, variant.priceDelta) } : {}),
      stockMode: variant.stockMode,
      active: variant.active,
      imageMediaIds: variant.imageMediaIds.map(String),
      images: media.map((view) => ({ id: view.id, url: view.url ?? '' })),
      isCustomColor: variant.isCustomColor,
      isCustomSize: variant.isCustomSize,
      createdAt: variant.createdAt,
    };
  }
}