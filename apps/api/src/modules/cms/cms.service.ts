import { HttpStatus, Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditService } from '../../common/auth/audit.service.js';
import { ERROR_CODES } from '../../common/errors/error-codes.js';
import { ApiException } from '../../common/exceptions/api.exception.js';
import { MediaService } from '../media/media.service.js';
import {
  CreateBannerDto,
  CreateCmsPageDto,
  UpdateBannerDto,
  UpdateCmsPageDto,
} from './dto/cms.dto.js';

export interface CmsPageDoc {
  _id: Types.ObjectId;
  slug: string;
  type: 'PAGE' | 'POLICY' | 'CONTACT' | 'FAQ';
  title: { en: string; ta?: string };
  content: { en: string; ta?: string };
  seo?: Record<string, unknown>;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: Date;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BannerDoc {
  _id: Types.ObjectId;
  title?: { en: string; ta?: string };
  imageMediaId: Types.ObjectId;
  ctaUrl?: string;
  ctaLabel?: { en: string; ta?: string };
  target?: 'PRODUCT' | 'CATEGORY' | 'PAGE' | 'EXTERNAL';
  location?: string;
  sortOrder: number;
  active: boolean;
  startAt?: Date;
  endAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CmsPageView {
  id: string;
  slug: string;
  type: CmsPageDoc['type'];
  title: CmsPageDoc['title'];
  content?: CmsPageDoc['content'];
  seo?: CmsPageDoc['seo'];
  status: CmsPageDoc['status'];
  publishedAt?: Date;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BannerView {
  id: string;
  title?: BannerDoc['title'];
  image?: { id: string; url: string };
  ctaUrl?: string;
  ctaLabel?: BannerDoc['ctaLabel'];
  target?: BannerDoc['target'];
  location?: string;
  sortOrder: number;
  active: boolean;
  startAt?: Date;
  endAt?: Date;
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
export class CmsService {
  constructor(
    private readonly audit: AuditService,
    private readonly media: MediaService,
    @Optional()
    @InjectModel('CmsPage')
    private readonly page: Model<any>,
    @Optional()
    @InjectModel('Banner')
    private readonly banner: Model<any>,
  ) {}

  private ensureReady(): void {
    if (!this.page || !this.banner) {
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'CMS service is unavailable',
      );
    }
  }

  private pageView(doc: CmsPageDoc): CmsPageView {
    return {
      id: String(doc._id),
      slug: doc.slug,
      type: doc.type,
      title: doc.title,
      ...(doc.content ? { content: doc.content } : {}),
      ...(doc.seo ? { seo: doc.seo } : {}),
      status: doc.status,
      ...(doc.publishedAt ? { publishedAt: doc.publishedAt } : {}),
      sortOrder: doc.sortOrder,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private async bannerViews(docs: BannerDoc[]): Promise<BannerView[]> {
    const mediaIds = docs.map((doc) => String(doc.imageMediaId));
    const mediaViews = mediaIds.length ? await this.media.findByIds(mediaIds) : [];
    const byId = new Map(mediaViews.map((view) => [view.id, view]));
    return docs.map((doc) => {
      const image = byId.get(String(doc.imageMediaId));
      return {
        id: String(doc._id),
        ...(doc.title ? { title: doc.title } : {}),
        ...(image ? { image: { id: image.id, url: image.url ?? '' } } : {}),
        ...(doc.ctaUrl ? { ctaUrl: doc.ctaUrl } : {}),
        ...(doc.ctaLabel ? { ctaLabel: doc.ctaLabel } : {}),
        ...(doc.target ? { target: doc.target } : {}),
        ...(doc.location ? { location: doc.location } : {}),
        sortOrder: doc.sortOrder,
        active: doc.active,
        ...(doc.startAt ? { startAt: doc.startAt } : {}),
        ...(doc.endAt ? { endAt: doc.endAt } : {}),
      };
    });
  }

  async createPage(dto: CreateCmsPageDto, actor: ActorContext): Promise<CmsPageView> {
    this.ensureReady();
    try {
      const created = await this.page.create({
        slug: dto.slug,
        type: dto.type,
        title: dto.title,
        ...(dto.content ? { content: dto.content } : {}),
        ...(dto.seo ? { seo: dto.seo } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      });
      await this.audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: 'CMS_PAGE_CREATED',
        entityType: 'cms-page',
        entityId: String(created._id),
        after: { slug: created.slug, type: created.type, status: created.status },
        meta: { ip: actor.ip, userAgent: actor.userAgent },
      });
      return this.pageView(created);
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw ApiException.conflict(`A CMS page with slug "${dto.slug}" already exists`);
      }
      throw error;
    }
  }

  async updatePage(id: string, dto: UpdateCmsPageDto, actor: ActorContext): Promise<CmsPageView> {
    this.ensureReady();
    const page = await this.getPageById(id);
    const before = { slug: page.slug, type: page.type, status: page.status };
    if (dto.slug !== undefined) page.slug = dto.slug;
    if (dto.type !== undefined) page.type = dto.type;
    if (dto.title !== undefined) page.title = dto.title;
    if (dto.content !== undefined) page.content = dto.content;
    if (dto.seo !== undefined) page.seo = dto.seo;
    if (dto.sortOrder !== undefined) page.sortOrder = dto.sortOrder;
    try {
      await page.save();
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw ApiException.conflict(`A CMS page with slug "${dto.slug}" already exists`);
      }
      throw error;
    }
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'CMS_PAGE_UPDATED',
      entityType: 'cms-page',
      entityId: id,
      before,
      after: { slug: page.slug, type: page.type, status: page.status },
      meta: { ip: actor.ip, userAgent: actor.userAgent },
    });
    return this.pageView(page);
  }

  async setPageStatus(
    id: string,
    action: 'publish' | 'unpublish' | 'archive',
    actor: ActorContext,
  ): Promise<CmsPageView> {
    this.ensureReady();
    const page = await this.getPageById(id);

    const transitions: Record<string, string> = {
      publish: 'PUBLISHED',
      unpublish: 'DRAFT',
      archive: 'ARCHIVED',
    };
    const target = transitions[action];
    if (!['PUBLISHED', 'DRAFT', 'ARCHIVED'].includes(page.status)) {
      throw ApiException.conflict(`CMS page is in an unexpected state "${page.status}"`);
    }
    if (page.status === target) {
      return this.pageView(page);
    }

    const before = page.status;
    page.status = target as CmsPageDoc['status'];
    if (target === 'PUBLISHED') page.publishedAt = new Date();
    await page.save();

    const auditAction =
      action === 'publish' ? 'CMS_PAGE_PUBLISHED' : action === 'archive' ? 'CMS_PAGE_ARCHIVED' : 'CMS_PAGE_UPDATED';
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: auditAction,
      entityType: 'cms-page',
      entityId: id,
      before: { status: before },
      after: { status: page.status },
      meta: { ip: actor.ip, userAgent: actor.userAgent },
    });
    return this.pageView(page);
  }

  /** Soft delete: archives the page (public routes stop serving it). */
  async removePage(id: string, actor: ActorContext): Promise<CmsPageView> {
    this.ensureReady();
    const page = await this.getPageById(id);
    const before = page.status;
    if (page.status !== 'ARCHIVED') {
      page.status = 'ARCHIVED';
      await page.save();
    }
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'CMS_PAGE_DELETED',
      entityType: 'cms-page',
      entityId: id,
      before: { status: before },
      after: { status: 'ARCHIVED' },
      meta: { ip: actor.ip, userAgent: actor.userAgent },
    });
    return this.pageView(page);
  }

  listPages(status?: string): Promise<CmsPageView[]> {
    this.ensureReady();
    const query = status ? { status } : {};
    return this.page.find(query).sort({ status: 1, sortOrder: 1, createdAt: -1 }).then((docs) => docs.map((doc) => this.pageView(doc)));
  }

  async getPublishedBySlug(slug: string): Promise<CmsPageView> {
    this.ensureReady();
    const doc = await this.page.findOne({ slug, status: 'PUBLISHED' });
    if (!doc) throw ApiException.notFound('Page not found');
    return this.pageView(doc);
  }

  private async getPageById(id: string): Promise<any> {
    this.ensureReady();
    if (!Types.ObjectId.isValid(id)) throw ApiException.notFound('CMS page not found');
    const doc = await this.page.findById(new Types.ObjectId(id));
    if (!doc) throw ApiException.notFound('CMS page not found');
    return doc;
  }

  async createBanner(dto: CreateBannerDto, actor: ActorContext): Promise<BannerView> {
    this.ensureReady();
    await this.requireMedia(dto.imageMediaId);
    const created = await this.banner.create({
      ...(dto.title ? { title: dto.title } : {}),
      imageMediaId: new Types.ObjectId(dto.imageMediaId),
      ...(dto.ctaUrl ? { ctaUrl: dto.ctaUrl } : {}),
      ...(dto.ctaLabel ? { ctaLabel: dto.ctaLabel } : {}),
      ...(dto.target ? { target: dto.target } : {}),
      ...(dto.location ? { location: dto.location } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
      ...(dto.startAt ? { startAt: dto.startAt } : {}),
      ...(dto.endAt ? { endAt: dto.endAt } : {}),
    });
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'BANNER_CREATED',
      entityType: 'banner',
      entityId: String(created._id),
      after: { imageMediaId: dto.imageMediaId, active: created.active },
      meta: { ip: actor.ip, userAgent: actor.userAgent },
    });
    return (await this.bannerViews([created]))[0];
  }

  async updateBanner(id: string, dto: UpdateBannerDto, actor: ActorContext): Promise<BannerView> {
    this.ensureReady();
    const banner = await this.getBannerById(id);
    if (dto.imageMediaId) await this.requireMedia(dto.imageMediaId);
    const before = { imageMediaId: String(banner.imageMediaId), active: banner.active };
    if (dto.title !== undefined) banner.title = dto.title;
    if (dto.imageMediaId !== undefined) banner.imageMediaId = new Types.ObjectId(dto.imageMediaId);
    if (dto.ctaUrl !== undefined) banner.ctaUrl = dto.ctaUrl;
    if (dto.ctaLabel !== undefined) banner.ctaLabel = dto.ctaLabel;
    if (dto.target !== undefined) banner.target = dto.target;
    if (dto.location !== undefined) banner.location = dto.location;
    if (dto.sortOrder !== undefined) banner.sortOrder = dto.sortOrder;
    if (dto.active !== undefined) banner.active = dto.active;
    if (dto.startAt !== undefined) banner.startAt = dto.startAt;
    if (dto.endAt !== undefined) banner.endAt = dto.endAt;
    await banner.save();
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'BANNER_UPDATED',
      entityType: 'banner',
      entityId: id,
      before,
      after: { imageMediaId: String(banner.imageMediaId), active: banner.active },
      meta: { ip: actor.ip, userAgent: actor.userAgent },
    });
    return (await this.bannerViews([banner]))[0];
  }

  async removeBanner(id: string, actor: ActorContext): Promise<BannerView> {
    this.ensureReady();
    const banner = await this.getBannerById(id);
    if (banner.active) {
      banner.active = false;
      await banner.save();
    }
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'BANNER_DELETED',
      entityType: 'banner',
      entityId: id,
      before: { active: true },
      after: { active: false },
      meta: { ip: actor.ip, userAgent: actor.userAgent },
    });
    return (await this.bannerViews([banner]))[0];
  }

  listBanners(): Promise<BannerView[]> {
    this.ensureReady();
    return this.banner.find().sort({ sortOrder: 1 }).then((docs) => this.bannerViews(docs));
  }

  async listActiveBanners(now = new Date()): Promise<BannerView[]> {
    this.ensureReady();
    const docs = await this.banner
      .find({
        active: true,
        $or: [
          { startAt: { $exists: false } },
          { startAt: { $lte: now } },
        ],
        $and: [
          { $or: [{ endAt: { $exists: false } }, { endAt: { $gte: now } }] },
        ],
      })
      .sort({ sortOrder: 1 });
    return this.bannerViews(docs);
  }

  private async requireMedia(mediaId: string): Promise<void> {
    const views = await this.media.findByIds([mediaId]);
    if (views.length === 0) {
      throw ApiException.badRequest(`Image media "${mediaId}" does not exist`);
    }
  }

  private async getBannerById(id: string): Promise<any> {
    this.ensureReady();
    if (!Types.ObjectId.isValid(id)) throw ApiException.notFound('Banner not found');
    const doc = await this.banner.findById(new Types.ObjectId(id));
    if (!doc) throw ApiException.notFound('Banner not found');
    return doc;
  }
}