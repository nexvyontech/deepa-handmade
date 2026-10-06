import { HttpStatus, Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditService } from '../../common/auth/audit.service.js';
import { ERROR_CODES } from '../../common/errors/error-codes.js';
import { ApiException } from '../../common/exceptions/api.exception.js';
import { effectivePrice } from '../../common/utils/money.js';
import { toSlug } from '../../common/utils/slug.js';
import { CategoriesService } from '../categories/categories.service.js';
import { MediaService } from '../media/media.service.js';
import { VariantOptionsService } from '../variants/variant-options.service.js';
import { VariantsService, type VariantView } from '../variants/variants.service.js';
import type {
  AdminListProductsDto,
  CreateProductDto,
  ProductSort,
  PublicListProductsDto,
  UpdateProductDto,
} from './dto/product.dto.js';
import { PRODUCT_STATUSES } from './dto/product.dto.js';
import { paginationMeta, productListQuery, sortFor } from './product-query.service.js';

export interface ProductDoc {
  _id: Types.ObjectId;
  name: { en: string; ta?: string };
  slug: string;
  sku: string;
  shortDesc?: string;
  description?: string;
  categoryId?: Types.ObjectId;
  basePrice: number;
  mrp?: number;
  moq: number;
  weightKg?: number;
  dimensions?: { length?: number; width?: number; height?: number; unit?: string };
  materialText?: { en: string; ta?: string };
  tags?: string[];
  status: (typeof PRODUCT_STATUSES)[number];
  featured: boolean;
  customizable: boolean;
  seo?: {
    title?: string;
    metaDescription?: string;
    canonicalUrl?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImageMediaId?: Types.ObjectId;
    noindex?: boolean;
  };
  searchText: string;
  ratingSummary: {
    average: number;
    count: number;
  };
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ProductPricingView {
  basePrice: number;
  mrp?: number;
  moq: number;
  effectivePrice: number;
  min: number;
  max: number;
}

export interface ProductListItemView {
  id: string;
  name: { en: string; ta?: string };
  slug: string;
  sku: string;
  shortDesc?: string;
  categoryId?: string;
  pricing: ProductPricingView;
  featured: boolean;
  customizable: boolean;
  tags?: string[];
  ratingSummary: { average: number; count: number };
  status?: (typeof PRODUCT_STATUSES)[number];
  searchText?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductDetailView extends ProductListItemView {
  description?: string;
  weightKg?: number;
  dimensions?: ProductDoc['dimensions'];
  materialText?: ProductDoc['materialText'];
  seo?: ProductDoc['seo'];
  category?: { id: string; slug: string; name: { en: string; ta?: string } } | null;
  media: Array<{ id: string; url: string; alt?: string }>;
  variants: Array<{ id: string; optionValueIds: string[] }>;
  createdBy?: string;
  updatedBy?: string;
}

export interface ActorContext {
  id: string;
  role: string;
  ip?: string;
  userAgent?: string;
}

function isDuplicateKey(error: unknown): boolean {
  return (error as { code?: number } | undefined)?.code === 11000;
}

function buildSearchText(fields: {
  nameEn: string;
  nameTa?: string;
  slug: string;
  sku: string;
  shortDesc?: string;
  description?: string;
  materialEn?: string;
  tags?: string[];
}): string {
  return [
    fields.nameEn,
    fields.nameTa,
    fields.slug,
    fields.sku,
    fields.shortDesc,
    fields.description,
    fields.materialEn,
    ...(fields.tags ?? []),
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase();
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly audit: AuditService,
    private readonly categories: CategoriesService,
    private readonly variantsService: VariantsService,
    private readonly options: VariantOptionsService,
    private readonly media: MediaService,
    @Optional()
    @InjectModel('Product')
    private readonly model: Model<any>,
  ) {}

  private ensureReady(): void {
    if (!this.model) {
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'Products service is unavailable',
      );
    }
  }

  private isActive(doc: ProductDoc): boolean {
    return doc.status === 'ACTIVE';
  }

  private pricing(basePriceIn: number, mrpIn: number | undefined, moqIn: number): ProductPricingView {
    const basePrice = Math.max(0, basePriceIn);
    return {
      basePrice,
      ...(mrpIn !== undefined ? { mrp: mrpIn } : {}),
      moq: moqIn,
      effectivePrice: effectivePrice(basePrice, 0),
      min: basePrice,
      max: basePrice,
    };
  }

  private toInputValues(dto: CreateProductDto | UpdateProductDto): {
    nameEn: string;
    nameTa?: string;
    slug?: string;
    sku?: string;
    shortDesc?: string;
    description?: string;
    materialEn?: string;
    tags?: string[];
  } {
    const nameEn = dto.name?.en ?? '';
    return {
      nameEn,
      nameTa: dto.name?.ta,
      slug: dto.slug,
      sku: dto.sku,
      shortDesc: dto.shortDesc,
      description: dto.description,
      materialEn: dto.materialText?.en,
      tags: dto.tags,
    };
  }

  private async slugFor(input: { nameEn: string; slug?: string }): Promise<string | null> {
    if (input.slug) {
      const existing = await this.model.findOne({ slug: input.slug });
      if (existing) throw ApiException.conflict(`A product with slug "${input.slug}" already exists`);
      return input.slug;
    }
    const slug = toSlug(input.nameEn);
    if (!slug) {
      throw ApiException.badRequest('A slug is required when the name cannot be slugified');
    }
    const existing = await this.model.findOne({ slug });
    return existing ? null : slug;
  }

  private async applySearchText(doc: ProductDoc): Promise<void> {
    if (this.model === undefined) return;
    const name = (doc.name as { en?: string; ta?: string }) ?? {};
    doc.searchText = buildSearchText({
      nameEn: name.en ?? '',
      nameTa: name.ta,
      slug: doc.slug,
      sku: doc.sku,
      shortDesc: doc.shortDesc,
      description: doc.description,
      materialEn: doc.materialText?.en,
      tags: doc.tags,
    }) || '';
  }

  async create(dto: CreateProductDto, actor: ActorContext) {
    this.ensureReady();

    const nameEn = dto.name?.en ?? '';
    const slug = await this.slugFor({ nameEn, slug: dto.slug });
    if (!slug) throw ApiException.conflict(`A slug could not be derived from "${nameEn}"`);

    const values = this.toInputValues(dto);
    const searchText = buildSearchText({
      nameEn,
      nameTa: values.nameTa,
      slug,
      sku: values.sku ?? '',
      shortDesc: values.shortDesc,
      description: values.description,
      materialEn: values.materialEn,
      tags: values.tags,
    });

    let categoryObjectId: Types.ObjectId | undefined;
    if (dto.categoryId) {
      categoryObjectId = await this.resolveCategory(dto.categoryId);
    }

    const sku = dto.sku.trim();
    const existingSku = await this.model.findOne({ sku });
    if (existingSku) throw ApiException.conflict(`A product with SKU "${sku}" already exists`);

    try {
      const created = await this.model.create({
        name: dto.name,
        slug,
        sku,
        shortDesc: dto.shortDesc,
        description: dto.description,
        ...(categoryObjectId ? { categoryId: categoryObjectId } : {}),
        basePrice: dto.basePrice,
        ...(dto.mrp !== undefined ? { mrp: dto.mrp } : {}),
        moq: dto.moq ?? 1,
        ...(dto.weightKg !== undefined ? { weightKg: dto.weightKg } : {}),
        ...(dto.dimensions ? { dimensions: dto.dimensions } : {}),
        ...(dto.materialText ? { materialText: dto.materialText } : {}),
        ...(dto.tags ? { tags: dto.tags } : {}),
        status: dto.status ?? 'DRAFT',
        ...(dto.featured !== undefined ? { featured: dto.featured } : {}),
        ...(dto.customizable !== undefined ? { customizable: dto.customizable } : {}),
        ...(dto.seo ? { seo: dto.seo } : {}),
        searchText,
        createdBy: new Types.ObjectId(actor.id),
      });

      await this.audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: 'PRODUCT_CREATED',
        entityType: 'product',
        entityId: String(created._id),
        after: { slug, sku, status: created.status },
        meta: { ip: actor.ip, userAgent: actor.userAgent },
      });
      return this.toListItem(created);
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw ApiException.conflict('A product with this slug or SKU already exists');
      }
      throw error;
    }
  }

  private async resolveCategory(categoryId: string): Promise<Types.ObjectId> {
    try {
      const doc = await this.categories.getById(categoryId);
      return doc._id;
    } catch {
      throw ApiException.badRequest(`Unknown category "${categoryId}"`);
    }
  }

  async update(id: string, dto: UpdateProductDto, actor: ActorContext) {
    this.ensureReady();
    if (!Types.ObjectId.isValid(id)) throw ApiException.notFound('Product not found');
    const doc = await this.model.findById(new Types.ObjectId(id));
    if (!doc) throw ApiException.notFound('Product not found');

    const statusBefore = doc.status;

    if (dto.slug !== undefined) {
      const slug = dto.slug;
      const dup = await this.model.findOne({ slug, _id: { $ne: doc._id } });
      if (dup) throw ApiException.conflict(`A product with slug "${slug}" already exists`);
      doc.slug = slug;
    }
    if (dto.sku !== undefined) {
      const sku = dto.sku.trim();
      const dup = await this.model.findOne({ sku, _id: { $ne: doc._id } });
      if (dup) throw ApiException.conflict(`A product with SKU "${sku}" already exists`);
      doc.sku = sku;
    }
    if (dto.name !== undefined) doc.name = dto.name;
    if (dto.shortDesc !== undefined) doc.shortDesc = dto.shortDesc;
    if (dto.description !== undefined) doc.description = dto.description;
    if (dto.weightKg !== undefined) doc.weightKg = dto.weightKg;
    if (dto.dimensions !== undefined) doc.dimensions = dto.dimensions;
    if (dto.materialText !== undefined) doc.materialText = dto.materialText;
    if (dto.tags !== undefined) doc.tags = dto.tags;
    if (dto.status !== undefined) doc.status = dto.status;
    if (dto.featured !== undefined) doc.featured = dto.featured;
    if (dto.customizable !== undefined) doc.customizable = dto.customizable;
    if (dto.seo !== undefined) doc.seo = dto.seo;
    if (dto.categoryId !== undefined) {
      if (dto.categoryId === '') doc.categoryId = undefined;
      else doc.categoryId = await this.resolveCategory(dto.categoryId);
    }
    doc.updatedBy = new Types.ObjectId(actor.id);
    await this.applySearchText(doc);
    await doc.save();

    const statusChanged = statusBefore !== doc.status;
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: statusChanged ? 'PRODUCT_STATUS_CHANGED' : 'PRODUCT_UPDATED',
      entityType: 'product',
      entityId: id,
      before: { status: statusBefore },
      after: { status: doc.status },
      meta: { ip: actor.ip, userAgent: actor.userAgent },
    });
    return this.toListItem(doc);
  }

  async remove(id: string, actor: ActorContext) {
    this.ensureReady();
    if (!Types.ObjectId.isValid(id)) throw ApiException.notFound('Product not found');
    const doc = await this.model.findById(new Types.ObjectId(id));
    if (!doc) throw ApiException.notFound('Product not found');
    if (doc.status !== 'ARCHIVED') {
      const before = doc.status;
      doc.status = 'ARCHIVED';
      doc.updatedBy = new Types.ObjectId(actor.id);
      await doc.save();
      await this.audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: 'PRODUCT_STATUS_CHANGED',
        entityType: 'product',
        entityId: id,
        before: { status: before },
        after: { status: 'ARCHIVED' },
        meta: { ip: actor.ip, userAgent: actor.userAgent },
      });
    }
    return this.toListItem(doc);
  }

  async listPublic(dto: PublicListProductsDto) {
    this.ensureReady();

    let categoryIds: string[] | undefined;
    if (dto.category) {
      let category;
      try {
        category = await this.categories.getBySlug(dto.category, true);
      } catch {
        return { items: [], page: dto.page ?? 1, limit: dto.limit ?? 20, total: 0, totalPages: 1 };
      }
      categoryIds = [String(category._id), ...(await this.categories.getDescendantIds(String(category._id)))];
    }

    const optionFilters: Array<{ optionType: string; value: string }> = [];
    if (dto.color) optionFilters.push({ optionType: 'COLOR', value: dto.color });
    if (dto.size) optionFilters.push({ optionType: 'SIZE', value: dto.size });
    if (dto.handle) optionFilters.push({ optionType: 'HANDLE', value: dto.handle });

    let productIds: string[] | undefined;
    if (optionFilters.length > 0) {
      productIds = await this.variantsService.productIdsForOptionFilters(optionFilters);
      if (productIds.length === 0) {
        return { items: [], page: dto.page ?? 1, limit: dto.limit ?? 20, total: 0, totalPages: 1 };
      }
    }

    const filter = productListQuery({
      status: 'ACTIVE',
      search: dto.q,
      categoryIds,
      productIds,
      priceMin: dto.priceMin,
      priceMax: dto.priceMax,
      featured: dto.featured,
    });

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const sort = sortFor((dto.sort ?? 'newest') as ProductSort);

    const [total, docs] = await Promise.all([
      this.model.countDocuments(filter),
      this.model.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
    ]);

    return {
      items: docs.map((doc) => this.toListItem(doc)),
      ...paginationMeta(total, page, limit),
    };
  }

  async listAdmin(dto: AdminListProductsDto) {
    this.ensureReady();
    let categoryIds: string[] | undefined;
    if (dto.categoryId) {
      categoryIds = [dto.categoryId, ...(await this.categories.getDescendantIds(dto.categoryId))];
    }
    const filter = productListQuery({
      status: dto.status ?? 'DRAFT',
      search: dto.q,
      categoryIds,
      featured: dto.featured,
    });
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const sort = sortFor((dto.sort ?? 'newest') as ProductSort);

    const [total, docs] = await Promise.all([
      this.model.countDocuments(filter),
      this.model.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
    ]);

    return {
      items: docs.map((doc) => this.toListItem(doc)),
      ...paginationMeta(total, page, limit),
    };
  }

  async getBySlug(slug: string, activeOnly = true): Promise<ProductDoc> {
    this.ensureReady();
    const doc = await this.model.findOne({ slug });
    if (!doc) throw ApiException.notFound('Product not found');
    if (activeOnly && !this.isActive(doc)) throw ApiException.notFound('Product not found');
    return doc;
  }

  async getById(id: string): Promise<ProductDoc> {
    this.ensureReady();
    if (!Types.ObjectId.isValid(id)) throw ApiException.notFound('Product not found');
    const doc = await this.model.findById(new Types.ObjectId(id));
    if (!doc) throw ApiException.notFound('Product not found');
    return doc;
  }

  private async detail(doc: ProductDoc, opts: { includeHidden: boolean }): Promise<ProductDetailView> {
    const variants = await this.variantsService.getByProduct(String(doc._id), !opts.includeHidden);
    const media = await this.media.findByOwner('PRODUCT', String(doc._id), 'AVAILABLE');

    const pricing = this.pricing(doc.basePrice, doc.mrp, doc.moq);
    if (variants.length > 0) {
      const prices = variants.map((variant) => doc.basePrice + variant.priceDelta);
      pricing.min = Math.min(pricing.min, ...prices);
      pricing.max = Math.max(pricing.max, ...prices);
    }

    const category = doc.categoryId ? await this.categories.getViewForId(String(doc.categoryId)) : null;

    const item = this.toListItem(doc);
    return {
      ...item,
      pricing,
      description: doc.description,
      weightKg: doc.weightKg,
      dimensions: doc.dimensions,
      materialText: doc.materialText,
      seo: doc.seo,
      category,
      media: media.map((view) => ({ id: view.id, url: view.url ?? '' })),
      variants: variants.map((variant) => ({ id: variant.id, optionValueIds: variant.optionValueIds })),
      ...(opts.includeHidden
        ? {
            searchText: doc.searchText,
            createdBy: doc.createdBy?.toString(),
            updatedBy: doc.updatedBy?.toString(),
          }
        : {}),
    };
  }

  async publicDetail(slug: string): Promise<ProductDetailView> {
    const doc = await this.getBySlug(slug, true);
    return this.detail(doc, { includeHidden: false });
  }

  /** Full variants of a product (used by the public variants route). */
  async variantsForProduct(productId: string): Promise<VariantView[]> {
    return this.variantsService.getByProduct(productId, true);
  }

  async adminDetail(id: string): Promise<ProductDetailView> {
    const doc = await this.getById(id);
    return this.detail(doc, { includeHidden: true });
  }

  toListItem(doc: ProductDoc): ProductListItemView {
    return {
      id: String(doc._id),
      name: doc.name,
      slug: doc.slug,
      sku: doc.sku,
      ...(doc.shortDesc ? { shortDesc: doc.shortDesc } : {}),
      ...(doc.categoryId ? { categoryId: String(doc.categoryId) } : {}),
      pricing: this.pricing(doc.basePrice, doc.mrp, doc.moq),
      featured: doc.featured,
      customizable: doc.customizable,
      ...(doc.tags ? { tags: doc.tags } : {}),
      ratingSummary: doc.ratingSummary ?? { average: 0, count: 0 },
      status: doc.status,
      searchText: doc.searchText,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}