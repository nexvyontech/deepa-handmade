import { HttpStatus, Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditService } from '../../common/auth/audit.service.js';
import { ERROR_CODES } from '../../common/errors/error-codes.js';
import { ApiException } from '../../common/exceptions/api.exception.js';
import { CreateVariantOptionDto, OptionType, UpdateVariantOptionDto } from './dto/variant.dto.js';

export interface VariantOptionDoc {
  _id: Types.ObjectId;
  optionType: OptionType;
  value: { en: string; ta?: string };
  hex?: string;
  displayOrder: number;
  active: boolean;
  createdAt: Date;
}

export interface VariantOptionView {
  id: string;
  optionType: OptionType;
  value: { en: string; ta?: string };
  hex?: string;
  displayOrder: number;
  active: boolean;
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
export class VariantOptionsService {
  constructor(
    private readonly audit: AuditService,
    @Optional()
    @InjectModel('VariantOption')
    private readonly model: Model<any>,
  ) {}

  private ensureReady(): void {
    if (!this.model) {
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'Variant options service is unavailable',
      );
    }
  }

  toView(doc: VariantOptionDoc): VariantOptionView {
    return {
      id: String(doc._id),
      optionType: doc.optionType,
      value: doc.value,
      ...(doc.hex ? { hex: doc.hex } : {}),
      displayOrder: doc.displayOrder,
      active: doc.active,
      createdAt: doc.createdAt,
    };
  }

  async create(dto: CreateVariantOptionDto, actor: ActorContext): Promise<VariantOptionView> {
    this.ensureReady();
    if (dto.optionType === 'COLOR' && !dto.hex) {
      throw ApiException.badRequest('hex is required for COLOR options');
    }
    try {
      const created = await this.model.create({
        optionType: dto.optionType,
        value: dto.value,
        ...(dto.hex ? { hex: dto.hex } : {}),
        ...(dto.displayOrder !== undefined ? { displayOrder: dto.displayOrder } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      });
      await this.audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: 'VARIANT_OPTION_CREATED',
        entityType: 'variant-option',
        entityId: String(created._id),
        after: { optionType: dto.optionType, value: dto.value },
        meta: { ip: actor.ip, userAgent: actor.userAgent },
      });
      return this.toView(created);
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw ApiException.conflict(
          `A ${dto.optionType} option with value "${dto.value.en}" already exists`,
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateVariantOptionDto, actor: ActorContext): Promise<VariantOptionView> {
    this.ensureReady();
    const option = await this.getById(id);
    if (option.optionType === 'COLOR' && dto.value?.en && !dto.hex && !option.hex) {
      throw ApiException.badRequest('hex is required for COLOR options');
    }

    const before = { value: option.value, hex: option.hex, displayOrder: option.displayOrder, active: option.active };
    const patch: Record<string, unknown> = {};
    if (dto.value) patch.value = dto.value;
    if (dto.hex !== undefined) patch.hex = dto.hex;
    if (dto.displayOrder !== undefined) patch.displayOrder = dto.displayOrder;
    if (dto.active !== undefined) patch.active = dto.active;

    try {
      Object.assign(option, patch);
      await option.save();
    } catch (error) {
      if (isDuplicateKey(error)) {
        const value = dto.value?.en ?? option.value.en;
        throw ApiException.conflict(`A ${option.optionType} option with value "${value}" already exists`);
      }
      throw error;
    }

    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'VARIANT_OPTION_UPDATED',
      entityType: 'variant-option',
      entityId: id,
      before,
      after: { value: option.value, hex: option.hex, displayOrder: option.displayOrder, active: option.active },
      meta: { ip: actor.ip, userAgent: actor.userAgent },
    });
    return this.toView(option);
  }

  async remove(id: string, actor: ActorContext): Promise<VariantOptionView> {
    this.ensureReady();
    const option = await this.getById(id);
    if (!option.active) return this.toView(option);
    option.active = false;
    await option.save();
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'VARIANT_OPTION_DELETED',
      entityType: 'variant-option',
      entityId: id,
      before: { active: true },
      after: { active: false },
      meta: { ip: actor.ip, userAgent: actor.userAgent },
    });
    return this.toView(option);
  }

  async getById(id: string): Promise<any> {
    this.ensureReady();
    if (!Types.ObjectId.isValid(id)) throw ApiException.notFound('Variant option not found');
    const doc = await this.model.findById(new Types.ObjectId(id));
    if (!doc) throw ApiException.notFound('Variant option not found');
    return doc;
  }

  async list(optionType?: string, activeOnly = false): Promise<VariantOptionView[]> {
    this.ensureReady();
    const query: Record<string, unknown> = {};
    if (optionType) query.optionType = optionType;
    if (activeOnly) query.active = true;
    const docs = await this.model.find(query).sort({ displayOrder: 1, 'value.en': 1 });
    return docs.map((doc) => this.toView(doc));
  }

  async findByIdsActive(ids: Types.ObjectId[]): Promise<VariantOptionDoc[]> {
    this.ensureReady();
    if (ids.length === 0) return [];
    return this.model.find({ _id: { $in: ids }, active: true });
  }

  /** Active options of one type whose English value equals `value` (case-insensitive). */
  async findByIdsForValue(optionType: string, value: string): Promise<VariantOptionDoc[]> {
    this.ensureReady();
    return this.model.find({
      optionType,
      active: true,
      'value.en': new RegExp(`^${escapeRegExp(value)}$`, 'i'),
    });
  }
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}