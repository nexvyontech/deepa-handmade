import { HttpStatus, Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditService } from '../../common/auth/audit.service.js';
import { ERROR_CODES } from '../../common/errors/error-codes.js';
import { ApiException } from '../../common/exceptions/api.exception.js';
import { SeoDto } from '../categories/dto/category.dto.js';

export type SeoEntityType = 'product' | 'category' | 'page';

export interface ActorContext {
  id: string;
  role: string;
  ip?: string;
  userAgent?: string;
}

interface SeoCarrier {
  seo?: Record<string, unknown> | null;
  save(): Promise<unknown>;
}

/**
 * SEO metadata management (Phase 5). Reads and writes the `seo` block that
 * lives on products, categories and CMS pages; every write is audited
 * `SEO_UPDATED`.
 */
@Injectable()
export class SeoService {
  constructor(
    private readonly audit: AuditService,
    @Optional()
    @InjectModel('Product')
    private readonly product?: Model<SeoCarrier & { _id: Types.ObjectId }>,
    @Optional()
    @InjectModel('Category')
    private readonly category?: Model<SeoCarrier & { _id: Types.ObjectId }>,
    @Optional()
    @InjectModel('CmsPage')
    private readonly page?: Model<SeoCarrier & { _id: Types.ObjectId }>,
  ) {}

  private modelFor(entityType: SeoEntityType): Model<SeoCarrier & { _id: Types.ObjectId }> | undefined {
    return entityType === 'product'
      ? this.product
      : entityType === 'category'
        ? this.category
        : this.page;
  }

  private ensureReady(): void {
    if (!this.product || !this.category || !this.page) {
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'SEO service is unavailable',
      );
    }
  }

  async get(entityType: SeoEntityType, entityId: string): Promise<{ entityType: SeoEntityType; entityId: string; seo: Record<string, unknown> | null }> {
    this.ensureReady();
    const doc = await this.resolve(entityType, entityId);
    return { entityType, entityId, seo: (doc.seo as Record<string, unknown>) ?? null };
  }

  async update(
    entityType: SeoEntityType,
    entityId: string,
    dto: SeoDto,
    actor: ActorContext,
  ): Promise<{ entityType: SeoEntityType; entityId: string; seo: Record<string, unknown> }> {
    this.ensureReady();
    const doc = await this.resolve(entityType, entityId);
    const before = { seo: doc.seo };
    const seo = {
      ...(dto.title ? { title: dto.title } : {}),
      ...(dto.metaDescription ? { metaDescription: dto.metaDescription } : {}),
      ...(dto.ogTitle ? { ogTitle: dto.ogTitle } : {}),
      ...(dto.ogDescription ? { ogDescription: dto.ogDescription } : {}),
      ...(dto.canonicalUrl ? { canonicalUrl: dto.canonicalUrl } : {}),
      ...(dto.ogImageMediaId ? { ogImageMediaId: new Types.ObjectId(dto.ogImageMediaId) } : {}),
      ...(dto.noindex !== undefined ? { noindex: dto.noindex } : {}),
    };
    doc.seo = seo;
    await doc.save();

    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'SEO_UPDATED',
      entityType,
      entityId,
      before,
      after: { seo },
      meta: { ip: actor.ip, userAgent: actor.userAgent },
    });
    return { entityType, entityId, seo };
  }

  private async resolve(entityType: SeoEntityType, entityId: string): Promise<SeoCarrier> {
    if (!Types.ObjectId.isValid(entityId)) throw ApiException.notFound('Entity not found');
    const model = this.modelFor(entityType);
    const label = entityType === 'product' ? 'Product' : entityType === 'category' ? 'Category' : 'CMS page';
    if (!model) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, ERROR_CODES.SERVICE_UNAVAILABLE, 'SEO service is unavailable');
    const doc = await model.findById(new Types.ObjectId(entityId));
    if (!doc) throw ApiException.notFound(`${label} not found`);
    return doc;
  }
}