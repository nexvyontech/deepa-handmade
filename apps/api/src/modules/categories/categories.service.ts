import { HttpStatus, Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditService } from '../../common/auth/audit.service.js';
import { ERROR_CODES } from '../../common/errors/error-codes.js';
import { ApiException } from '../../common/exceptions/api.exception.js';
import { SLUG_PATTERN, toSlug } from '../../common/utils/slug.js';
import { MediaService } from '../media/media.service.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';

export interface SeoBlock {
  title?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  canonicalUrl?: string;
  ogImageMediaId?: string;
  noindex?: boolean;
}

export interface CategoryDoc {
  _id: Types.ObjectId;
  name: { en: string; ta?: string };
  slug: string;
  parentId?: Types.ObjectId;
  imageMediaId?: Types.ObjectId;
  bannerMediaId?: Types.ObjectId;
  active: boolean;
  sortOrder: number;
  seo?: SeoBlock;
  createdAt: Date;
}

export interface CategoryView {
  id: string;
  name: { en: string; ta?: string };
  slug: string;
  parentId?: string;
  imageMediaId?: string;
  bannerMediaId?: string;
  image?: { id: string; url: string };
  banner?: { id: string; url: string };
  active: boolean;
  sortOrder: number;
  seo?: SeoBlock;
  createdAt?: Date;
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

@Injectable()
export class CategoriesService {
  constructor(
    private readonly audit: AuditService,
    private readonly media: MediaService,
    @Optional()
    @InjectModel('Category')
    private readonly model: Model<any>,
  ) {}

  private ensureReady(): void {
    if (!this.model) {
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'Categories service is unavailable',
      );
    }
  }

  private async ensureParent(parentId?: string): Promise<void> {
    if (!parentId) return;
    const exists = await this.model?.exists({ _id: new Types.ObjectId(parentId) });
    if (!exists) throw ApiException.badRequest('Parent category does not exist');
  }

  private parentMatch(parentId?: string): Record<string, unknown> {
    return parentId
      ? { parentId: new Types.ObjectId(parentId) }
      : { parentId: { $exists: false } };
  }

  private async ensureUniqueName(nameEn: string, parentId: string | undefined, excludeId?: string): Promise<void> {
    const query: Record<string, unknown> = {
      ...this.parentMatch(parentId),
      'name.en': nameEn.trim(),
    };
    if (excludeId) query._id = { $ne: new Types.ObjectId(excludeId) };
    const dup = await this.model?.findOne(query);
    if (dup) {
      throw ApiException.conflict('A category with the same name already exists under this parent');
    }
  }

  private resolveSlug(slug: string | undefined, nameEn: string): string {
    if (slug !== undefined) {
      if (!SLUG_PATTERN.test(slug)) {
        throw ApiException.badRequest('slug may contain lowercase letters, digits and single hyphens');
      }
      return slug.toLowerCase();
    }
    const generated = toSlug(nameEn);
    if (!generated) {
      throw ApiException.badRequest('A slug is required when the name has no Latin characters');
    }
    return generated;
  }

  async create(dto: CreateCategoryDto, actor: ActorContext): Promise<CategoryView> {
    this.ensureReady();
    await this.ensureParent(dto.parentId);
    await this.ensureUniqueName(dto.name.en, dto.parentId);
    const slug = this.resolveSlug(dto.slug, dto.name.en);

    try {
      const created = await this.model.create({
        name: dto.name,
        slug,
        ...(dto.parentId ? { parentId: new Types.ObjectId(dto.parentId) } : {}),
        ...(dto.imageMediaId ? { imageMediaId: new Types.ObjectId(dto.imageMediaId) } : {}),
        ...(dto.bannerMediaId ? { bannerMediaId: new Types.ObjectId(dto.bannerMediaId) } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.seo ? { seo: dto.seo } : {}),
      });
      await this.audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: 'CATEGORY_CREATED',
        entityType: 'category',
        entityId: String(created._id),
        after: { name: dto.name, slug, parentId: dto.parentId },
        meta: { ip: actor.ip, userAgent: actor.userAgent },
      });
      return this.toView(created);
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw ApiException.conflict('A category with this slug already exists');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateCategoryDto, actor: ActorContext): Promise<CategoryView> {
    this.ensureReady();
    const category = await this.getById(id);

    const currentParent = category.parentId ? String(category.parentId) : undefined;
    const resolvedParent = dto.parentId !== undefined
      ? dto.parentId === '' ? undefined : dto.parentId
      : currentParent;

    if (dto.parentId !== undefined && dto.parentId !== '' && !Types.ObjectId.isValid(dto.parentId)) {
      throw ApiException.badRequest('parentId must be a valid ObjectId');
    }
    if (dto.parentId !== undefined && dto.parentId !== '') {
      await this.ensureParent(dto.parentId);
      await this.ensureNotCycle(id, dto.parentId);
    }

    if (dto.name && dto.name.en !== category.name.en) {
      await this.ensureUniqueName(dto.name.en, resolvedParent, id);
    }

    const before = {
      name: category.name,
      slug: category.slug,
      active: category.active,
      sortOrder: category.sortOrder,
      parentId: currentParent,
    };

    const patch: Record<string, unknown> = {};
    if (dto.name) patch.name = dto.name;
    if (dto.slug !== undefined) {
      const slug = this.resolveSlug(dto.slug, category.name.en);
      if (slug !== category.slug) patch.slug = slug;
    }
    if (dto.parentId !== undefined) {
      patch.parentId = dto.parentId === '' ? undefined : new Types.ObjectId(dto.parentId);
    }
    if (dto.imageMediaId !== undefined) {
      if (dto.imageMediaId !== '' && !Types.ObjectId.isValid(dto.imageMediaId)) {
        throw ApiException.badRequest('imageMediaId must be a valid ObjectId');
      }
      patch.imageMediaId = dto.imageMediaId === '' ? undefined : new Types.ObjectId(dto.imageMediaId);
    }
    if (dto.bannerMediaId !== undefined) {
      if (dto.bannerMediaId !== '' && !Types.ObjectId.isValid(dto.bannerMediaId)) {
        throw ApiException.badRequest('bannerMediaId must be a valid ObjectId');
      }
      patch.bannerMediaId = dto.bannerMediaId === '' ? undefined : new Types.ObjectId(dto.bannerMediaId);
    }
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;
    if (dto.seo !== undefined) patch.seo = dto.seo;
    if (dto.active !== undefined) patch.active = dto.active;

    try {
      Object.assign(category, patch);
      await category.save();
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw ApiException.conflict('A category with this slug already exists');
      }
      throw error;
    }

    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: dto.active === false ? 'CATEGORY_DEACTIVATED' : 'CATEGORY_UPDATED',
      entityType: 'category',
      entityId: id,
      before,
      after: {
        name: category.name,
        slug: category.slug,
        active: category.active,
        sortOrder: category.sortOrder,
        parentId: category.parentId ? String(category.parentId) : undefined,
      },
      meta: { ip: actor.ip, userAgent: actor.userAgent },
    });
    return this.toView(category);
  }

  private async ensureNotCycle(id: string, newParentId: string): Promise<void> {
    let cursor: string | undefined = newParentId;
    const visited = new Set<string>([id]);
    while (cursor) {
      if (visited.has(cursor)) {
        throw ApiException.conflict('A category cannot be its own ancestor');
      }
      visited.add(cursor);
      const parent: any = await this.model?.findById(cursor);
      cursor = parent?.parentId ? String(parent.parentId) : undefined;
    }
  }

  async remove(id: string, actor: ActorContext): Promise<CategoryView> {
    this.ensureReady();
    const category = await this.getById(id);
    if (!category.active) {
      return this.toView(category);
    }
    const activeChildren = await this.model.countDocuments({
      parentId: category._id,
      active: true,
    });
    if (activeChildren > 0) {
      throw ApiException.conflict('Active sub-categories must be deactivated first', {
        activeChildren,
      });
    }
    category.active = false;
    await category.save();
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'CATEGORY_DEACTIVATED',
      entityType: 'category',
      entityId: id,
      before: { active: true },
      after: { active: false },
      meta: { ip: actor.ip, userAgent: actor.userAgent },
    });
    return this.toView(category);
  }

  async getById(id: string): Promise<any> {
    this.ensureReady();
    if (!Types.ObjectId.isValid(id)) throw ApiException.notFound('Category not found');
    return this.model.findById(new Types.ObjectId(id));
  }

  /** Single-category view, or null (no throw) — used by product/CMS composition. */
  async getViewForId(id: string): Promise<CategoryView | null> {
    this.ensureReady();
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(new Types.ObjectId(id));
    if (!doc) return null;
    return this.toView(doc);
  }

  async getBySlug(slug: string, activeOnly = true): Promise<any> {
    this.ensureReady();
    const doc = await this.model.findOne({ slug });
    if (!doc) throw ApiException.notFound('Category not found');
    if (activeOnly && !doc.active) throw ApiException.notFound('Category not found');
    return doc;
  }

  async list(): Promise<CategoryView[]> {
    this.ensureReady();
    const docs = await this.model.find().sort({ sortOrder: 1, 'name.en': 1 });
    return this.toViews(docs);
  }

  async listActive(): Promise<CategoryView[]> {
    this.ensureReady();
    const docs = await this.model
      .find({ active: true })
      .sort({ sortOrder: 1, 'name.en': 1 });
    return this.toViews(docs);
  }

  /** Ids of every category under `id` in the tree (children, grandchildren, ...). */
  async getDescendantIds(id: string): Promise<string[]> {
    this.ensureReady();
    const root = await this.getById(id);
    const all = await this.model.find({}, { _id: 1, parentId: 1 });
    const childrenByParent = new Map<string, string[]>();
    for (const doc of all) {
      if (!doc.parentId) continue;
      const parent = String(doc.parentId);
      const list = childrenByParent.get(parent) ?? [];
      list.push(String(doc._id));
      childrenByParent.set(parent, list);
    }

    const result: string[] = [];
    const queue = [String(root._id)];
    const seen = new Set<string>([String(root._id)]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current !== String(root._id)) {
        result.push(current);
        seen.add(current);
      }
      for (const child of childrenByParent.get(current) ?? []) {
        if (!seen.has(child)) queue.push(child);
      }
    }
    return result;
  }

  private async toViews(docs: CategoryDoc[]): Promise<CategoryView[]> {
    const mediaIds = new Set<string>();
    for (const doc of docs) {
      if (doc.imageMediaId) mediaIds.add(String(doc.imageMediaId));
      if (doc.bannerMediaId) mediaIds.add(String(doc.bannerMediaId));
    }
    const mediaViews = mediaIds.size ? await this.media.findByIds([...mediaIds]) : [];
    const byId = new Map(mediaViews.map((view) => [view.id, view]));

    return docs.map((doc) => {
      const image = doc.imageMediaId ? byId.get(String(doc.imageMediaId)) : undefined;
      const banner = doc.bannerMediaId ? byId.get(String(doc.bannerMediaId)) : undefined;
      return {
        id: String(doc._id),
        name: doc.name,
        slug: doc.slug,
        ...(doc.parentId ? { parentId: String(doc.parentId) } : {}),
        ...(doc.imageMediaId ? { imageMediaId: String(doc.imageMediaId) } : {}),
        ...(doc.bannerMediaId ? { bannerMediaId: String(doc.bannerMediaId) } : {}),
        ...(image ? { image: { id: image.id, url: image.url! } } : {}),
        ...(banner ? { banner: { id: banner.id, url: banner.url! } } : {}),
        active: doc.active,
        sortOrder: doc.sortOrder,
        ...(doc.seo ? { seo: doc.seo } : {}),
        createdAt: doc.createdAt,
      };
    });
  }

  toView(doc: CategoryDoc): Promise<CategoryView> {
    return this.toViews([doc]).then((views) => views[0]);
  }
}