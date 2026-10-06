import { HttpStatus, Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Readable } from 'node:stream';
import { AuditService } from '../../common/auth/audit.service.js';
import { ERROR_CODES } from '../../common/errors/error-codes.js';
import { ApiException } from '../../common/exceptions/api.exception.js';
import { STORAGE_SERVICE } from '../../common/storage/storage.module.js';
import { StorageService } from '../../common/storage/storage.service.js';
import { buildStorageKey } from '../../common/storage/local-storage.service.js';
import { MediaKind } from './media-validation.js';
import { isOwnerType, type ActorContext, UpdateMediaDto } from './dto/media.dto.js';
import { validateUpload, type UploadFile } from './media-validation.js';

export interface MediaDoc {
  _id: Types.ObjectId;
  ownerType: string;
  ownerId: Types.ObjectId;
  kind: string;
  bucket: 'PUBLIC' | 'PRIVATE';
  storagePath: string;
  mime: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSec?: number;
  alt?: { en: string; ta?: string };
  status: string;
  isPrimary: boolean;
  sortOrder: number;
  uploadedBy?: Types.ObjectId;
  createdAt: Date;
}

export interface MediaView {
  id: string;
  ownerType: string;
  ownerId: string;
  kind: MediaKind;
  bucket: 'PUBLIC' | 'PRIVATE';
  mime: string;
  sizeBytes: number;
  status: string;
  isPrimary: boolean;
  sortOrder: number;
  uploadedBy?: string;
  createdAt?: Date;
  url?: string;
}

function isDuplicateKey(error: unknown): boolean {
  return (error as { code?: number } | undefined)?.code === 11000;
}

@Injectable()
export class MediaService {
  constructor(
    private readonly config: ConfigService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    private readonly audit: AuditService,
    @Optional()
    @InjectModel('Media')
    private readonly media: Model<any>,
    @Optional()
    @InjectModel('Category')
    private readonly category?: Model<unknown>,
    @Optional()
    @InjectModel('Product')
    private readonly product?: Model<unknown>,
    @Optional()
    @InjectModel('ProductVariant')
    private readonly variant?: Model<unknown>,
    @Optional()
    @InjectModel('CmsPage')
    private readonly cmsPage?: Model<unknown>,
    @Optional()
    @InjectModel('Banner')
    private readonly banner?: Model<unknown>,
  ) {}

  private ensureReady(): void {
    if (!this.media) {
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'Media service is unavailable',
      );
    }
  }

  private ownerPublicUrl(media: MediaDoc): string | null {
    if (media.bucket !== 'PUBLIC') return null;
    return this.storage.publicUrl(media.storagePath);
  }

  toView(media: MediaDoc): MediaView {
    const direct = this.ownerPublicUrl(media);
    return {
      id: String(media._id),
      ownerType: media.ownerType,
      ownerId: String(media.ownerId),
      kind: media.kind as MediaKind,
      bucket: media.bucket,
      mime: media.mime,
      sizeBytes: media.sizeBytes,
      status: media.status,
      isPrimary: media.isPrimary,
      sortOrder: media.sortOrder,
      uploadedBy: media.uploadedBy ? String(media.uploadedBy) : undefined,
      createdAt: media.createdAt,
      url: direct ?? `/media/${String(media._id)}/content`,
    };
  }

  async findByIds(ids: string[]): Promise<MediaView[]> {
    this.ensureReady();
    const objectIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (objectIds.length === 0) return [];
    const docs = await this.media.find({ _id: { $in: objectIds } }).sort({ isPrimary: -1, sortOrder: 1 });
    return docs.map((doc) => this.toView(doc));
  }

  /** Media of one owner, in display order (used by product/CMS composition). */
  async findByOwner(
    ownerType: string,
    ownerId: string,
    status?: 'AVAILABLE' | 'HIDDEN' | 'REJECTED',
  ): Promise<MediaView[]> {
    this.ensureReady();
    if (!isOwnerType(ownerType)) {
      throw ApiException.badRequest(`Unsupported ownerType "${ownerType}"`);
    }
    if (!Types.ObjectId.isValid(ownerId)) {
      throw ApiException.badRequest('ownerId must be a valid ObjectId');
    }
    const query: Record<string, unknown> = {
      ownerType: ownerType.toUpperCase(),
      ownerId: new Types.ObjectId(ownerId),
      ...(status ? { status } : {}),
    };
    const docs = await this.media.find(query).sort({ sortOrder: 1, createdAt: -1 });
    return docs.map((doc) => this.toView(doc));
  }

  async upload(
    ownerType: string,
    ownerId: string,
    file: UploadFile | undefined,
    fields: { bucket?: 'PUBLIC' | 'PRIVATE'; isPrimary?: boolean; sortOrder?: number },
    actor: ActorContext,
  ): Promise<MediaView> {
    this.ensureReady();
    if (!isOwnerType(ownerType)) {
      throw ApiException.badRequest(`Unsupported ownerType "${ownerType}"`);
    }
    if (!Types.ObjectId.isValid(ownerId)) {
      throw ApiException.badRequest('ownerId must be a valid ObjectId');
    }

    const limits = {
      maxImageBytes: this.config.get<number>('media.maxImageBytes') ?? 10 * 1024 * 1024,
      maxVideoBytes: this.config.get<number>('media.maxVideoBytes') ?? 100 * 1024 * 1024,
    };
    const validated = validateUpload(file, limits);

    const bucket = fields.bucket ?? 'PUBLIC';
    const data = file?.buffer ?? Buffer.alloc(0);

    let key = buildStorageKey(ownerType, validated.ext);
    await this.storage.put(key, data, validated.mime);

    const docBase = {
      ownerType: ownerType.toUpperCase(),
      ownerId: new Types.ObjectId(ownerId),
      kind: validated.kind,
      bucket,
      storagePath: key,
      mime: validated.mime,
      sizeBytes: validated.sizeBytes,
      status: 'AVAILABLE',
      isPrimary: fields.isPrimary ?? false,
      sortOrder: fields.sortOrder ?? 0,
      uploadedBy: Types.ObjectId.isValid(actor.id) ? new Types.ObjectId(actor.id) : undefined,
    };

    if (fields.isPrimary) {
      await this.media.updateMany(
        { ownerType: ownerType.toUpperCase(), ownerId: new Types.ObjectId(ownerId) },
        { $set: { isPrimary: false } },
      );
    }

    try {
      const created = await this.media.create(docBase);
      await this.audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: 'MEDIA_UPLOADED',
        entityType: 'media',
        entityId: String(created._id),
        meta: { ip: actor.ip, userAgent: actor.userAgent },
      });
      return this.toView(created);
    } catch (error) {
      if (isDuplicateKey(error)) {
        // StoragePath collision (UUID) — roll back the object and retry once.
        await this.storage.remove(key);
        key = buildStorageKey(ownerType, validated.ext);
        await this.storage.put(key, data, validated.mime);
        const retried = await this.media.create({ ...docBase, storagePath: key });
        await this.audit.record({
          actorId: actor.id,
          actorRole: actor.role,
          action: 'MEDIA_UPLOADED',
          entityType: 'media',
          entityId: String(retried._id),
          meta: { ip: actor.ip, userAgent: actor.userAgent },
        });
        return this.toView(retried);
      }
      throw error;
    }
  }

  async list(filters: {
    ownerType?: string;
    ownerId?: string;
    status?: string;
    bucket?: string;
    page: number;
    limit: number;
  }): Promise<{ items: MediaView[]; page: number; limit: number; total: number; totalPages: number }> {
    this.ensureReady();
    const query: Record<string, unknown> = {};
    if (filters.ownerType) query.ownerType = filters.ownerType.toUpperCase();
    if (filters.ownerId) query.ownerId = new Types.ObjectId(filters.ownerId);
    if (filters.status) query.status = filters.status;
    if (filters.bucket) query.bucket = filters.bucket;

    const total = await this.media.countDocuments(query);
    const docs = await this.media
      .find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((filters.page - 1) * filters.limit)
      .limit(filters.limit);

    return {
      items: docs.map((doc) => this.toView(doc)),
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit) || 1,
    };
  }

  async getById(id: string): Promise<any> {
    this.ensureReady();
    if (!Types.ObjectId.isValid(id)) throw ApiException.notFound('Media not found');
    const doc = await this.media.findById(new Types.ObjectId(id));
    if (!doc) throw ApiException.notFound('Media not found');
    return doc;
  }

  async getContent(
    id: string,
    actor?: { id: string; permissions?: string[] } | null,
  ): Promise<{ redirectUrl?: string; stream?: Readable; mime: string }> {
    this.ensureReady();
    const media = await this.getById(id);

    if (media.bucket === 'PRIVATE') {
      const allowed =
        actor &&
        (String(media.uploadedBy) === actor.id || (actor.permissions ?? []).includes('media.read'));
      if (!allowed) {
        throw new ApiException(
          HttpStatus.FORBIDDEN,
          ERROR_CODES.FORBIDDEN,
          'Insufficient permission to access this media',
        );
      }
    }

    const direct = this.ownerPublicUrl(media);
    if (direct) return { redirectUrl: direct, mime: media.mime };
    return { stream: await this.storage.get(media.storagePath), mime: media.mime };
  }

  async update(id: string, dto: UpdateMediaDto, actor: ActorContext): Promise<MediaView> {
    this.ensureReady();
    const media = await this.getById(id);
    const before = {
      alt: media.alt,
      status: media.status,
      isPrimary: media.isPrimary,
      sortOrder: media.sortOrder,
    };

    if (dto.isPrimary) {
      await this.media.updateMany(
        { ownerType: media.ownerType, ownerId: media.ownerId, _id: { $ne: media._id } },
        { $set: { isPrimary: false } },
      );
    }

    const patch: Record<string, unknown> = {};
    if (dto.alt !== undefined) patch.alt = dto.alt;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.isPrimary !== undefined) patch.isPrimary = dto.isPrimary;
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;

    Object.assign(media, patch);
    await media.save();

    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'MEDIA_UPDATED',
      entityType: 'media',
      entityId: id,
      before,
      after: { alt: media.alt, status: media.status, isPrimary: media.isPrimary, sortOrder: media.sortOrder },
      meta: { ip: actor.ip, userAgent: actor.userAgent },
    });
    return this.toView(media);
  }

  /** Replace the display order of an owner's AVAILABLE media (first = primary). */
  async setOrder(
    ownerType: string,
    ownerId: string,
    mediaIds: string[],
    actor: ActorContext,
  ): Promise<MediaView[]> {
    this.ensureReady();
    if (!isOwnerType(ownerType) || !Types.ObjectId.isValid(ownerId)) {
      throw ApiException.badRequest('Invalid ownerType or ownerId');
    }
    if (mediaIds.length === 0) {
      throw ApiException.badRequest('mediaIds must not be empty');
    }
    const objectIds = mediaIds.map((id) => {
      if (!Types.ObjectId.isValid(id)) throw ApiException.badRequest(`Invalid media id "${id}"`);
      return new Types.ObjectId(id);
    });

    const docs = await this.media.find({ _id: { $in: objectIds } });
    const owned = (await this.media.find({ ownerType: ownerType.toUpperCase(), ownerId: new Types.ObjectId(ownerId), status: { $ne: 'HIDDEN' } })).map((doc) => String(doc._id));
    const requestKey = [...mediaIds].sort().join('|');
    const ownedKey = [...owned].sort().join('|');
    if (docs.length !== objectIds.length || requestKey !== ownedKey) {
      throw ApiException.conflict(
        'The requested media set does not match the product media set; re-sync and retry',
      );
    }

    for (let index = 0; index < mediaIds.length; index += 1) {
      await this.media.updateOne(
        { _id: objectIds[index] },
        { $set: { sortOrder: index, isPrimary: index === 0 } },
      );
    }

    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'MEDIA_UPDATED',
      entityType: 'media',
      entityId: ownerId,
      before: { order: owned },
      after: { order: mediaIds },
      meta: { ip: actor.ip, userAgent: actor.userAgent },
    });
    return this.findByOwner(ownerType, ownerId);
  }

  async remove(id: string, actor: ActorContext): Promise<void> {
    this.ensureReady();
    const media = await this.getById(id);

    const ref = await this.resolveReference(media._id);
    if (ref) {
      throw ApiException.conflict('Media is still referenced by another entity', { referencedBy: ref });
    }

    await this.storage.remove(media.storagePath);
    await this.media.deleteOne({ _id: media._id });

    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'MEDIA_DELETED',
      entityType: 'media',
      entityId: id,
      meta: { ip: actor.ip, userAgent: actor.userAgent },
    });
  }

  private async resolveReference(mediaId: Types.ObjectId): Promise<string | null> {
    const query = async (model: Model<unknown> | undefined, filter: Record<string, unknown>): Promise<string | null> => {
      if (!model) return null;
      const found = await (model as Model<{ _id: unknown }>).findOne(filter);
      return found ? 'yes' : null;
    };

    const candidates: Array<Promise<string | null>> = [
      query(this.category, { $or: [{ imageMediaId: mediaId }, { bannerMediaId: mediaId }] }),
      query(this.category, { 'seo.ogImageMediaId': mediaId }),
      query(this.product, { 'seo.ogImageMediaId': mediaId }),
      query(this.cmsPage, { 'seo.ogImageMediaId': mediaId }),
      query(this.banner, { imageMediaId: mediaId }),
      query(this.variant, { imageMediaIds: mediaId }),
    ];

    const labels = ['category image/banner', 'category og image', 'product og image', 'cms page og image', 'banner image', 'variant image'] as const;
    const results = await Promise.all(candidates);
    const label = labels.find((_, index) => results[index] === 'yes');
    return label ?? null;
  }
}