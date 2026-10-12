import { HttpStatus, Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ERROR_CODES } from '../../common/errors/error-codes.js';
import { ApiException } from '../../common/exceptions/api.exception.js';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto.js';

export interface AddressView {
  id: string;
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
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AddressDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
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
  isDefault: boolean;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  save(): Promise<unknown>;
}

@Injectable()
export class AddressesService {
  constructor(
    @Optional()
    @InjectModel('Address')
    private readonly model: Model<any>,
  ) {}

  private ensureReady(): void {
    if (!this.model) {
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'Addresses service is unavailable',
      );
    }
  }

  async list(userId: string): Promise<AddressView[]> {
    this.ensureReady();
    const docs = await this.model
      .find({ userId: new Types.ObjectId(userId), deletedAt: { $exists: false } })
      .sort({ isDefault: -1, createdAt: 1 });
    return docs.map((doc: AddressDoc) => this.toView(doc));
  }

  async create(userId: string, dto: CreateAddressDto): Promise<AddressView> {
    this.ensureReady();
    const count = await this.model.countDocuments({
      userId: new Types.ObjectId(userId),
      deletedAt: { $exists: false },
    });
    const wantsDefault = dto.isDefault === true;
    if (count === 0 || wantsDefault) {
      await this.clearDefault(userId);
    }
    const doc = await this.model.create({
      userId: new Types.ObjectId(userId),
      recipient: dto.recipient.trim(),
      mobile: dto.mobile.trim(),
      line1: dto.line1.trim(),
      ...(dto.line2 ? { line2: dto.line2.trim() } : {}),
      villageTown: dto.villageTown.trim(),
      district: dto.district.trim(),
      state: dto.state.trim(),
      pincode: dto.pincode.trim(),
      ...(dto.landmark ? { landmark: dto.landmark.trim() } : {}),
      ...(dto.label ? { label: dto.label.trim() } : {}),
      isDefault: wantsDefault || count === 0,
    });
    return this.toView(doc as AddressDoc);
  }

  async update(userId: string, addressId: string, dto: UpdateAddressDto): Promise<AddressView> {
    const doc = await this.getOwned(userId, addressId);
    if (dto.recipient !== undefined) doc.recipient = dto.recipient.trim();
    if (dto.mobile !== undefined) doc.mobile = dto.mobile.trim();
    if (dto.line1 !== undefined) doc.line1 = dto.line1.trim();
    if (dto.line2 !== undefined) doc.line2 = dto.line2 ? dto.line2.trim() : undefined;
    if (dto.villageTown !== undefined) doc.villageTown = dto.villageTown.trim();
    if (dto.district !== undefined) doc.district = dto.district.trim();
    if (dto.state !== undefined) doc.state = dto.state.trim();
    if (dto.pincode !== undefined) doc.pincode = dto.pincode.trim();
    if (dto.landmark !== undefined) doc.landmark = dto.landmark ? dto.landmark.trim() : undefined;
    if (dto.label !== undefined) doc.label = dto.label ? dto.label.trim() : undefined;
    if (dto.isDefault === true) {
      await this.clearDefault(userId, doc._id);
      doc.isDefault = true;
    }
    await doc.save();
    return this.toView(doc);
  }

  async remove(userId: string, addressId: string): Promise<AddressView> {
    const doc = await this.getOwned(userId, addressId);
    doc.deletedAt = new Date();
    await doc.save();
    if (doc.isDefault) {
      const next = await this.model
        .findOne({ userId: new Types.ObjectId(userId), deletedAt: { $exists: false } })
        .sort({ createdAt: 1 });
      if (next) {
        next.isDefault = true;
        await next.save();
      }
    }
    return this.toView(doc);
  }

  async setDefault(userId: string, addressId: string): Promise<AddressView> {
    const doc = await this.getOwned(userId, addressId);
    if (!doc.isDefault) {
      await this.clearDefault(userId, doc._id);
      doc.isDefault = true;
      await doc.save();
    }
    return this.toView(doc);
  }

  /** Owner-scoped lookup for checkout. */
  async getOwned(userId: string, addressId: string): Promise<AddressDoc> {
    this.ensureReady();
    if (!Types.ObjectId.isValid(addressId)) throw ApiException.notFound('Address not found');
    const doc = await this.model.findOne({
      _id: new Types.ObjectId(addressId),
      userId: new Types.ObjectId(userId),
      deletedAt: { $exists: false },
    });
    if (!doc) throw ApiException.notFound('Address not found');
    return doc as AddressDoc;
  }

  /** Owner-scoped lookup returning a validated read model (used by checkout). */
  async getView(userId: string, addressId: string): Promise<AddressView> {
    return this.toView(await this.getOwned(userId, addressId));
  }

  private async clearDefault(userId: string, exceptId?: Types.ObjectId): Promise<void> {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
      isDefault: true,
      deletedAt: { $exists: false },
    };
    if (exceptId) filter._id = { $ne: exceptId };
    await this.model.updateMany(filter, { $set: { isDefault: false } });
  }

  private toView(doc: AddressDoc): AddressView {
    return {
      id: String(doc._id),
      recipient: doc.recipient,
      mobile: doc.mobile,
      line1: doc.line1,
      ...(doc.line2 ? { line2: doc.line2 } : {}),
      villageTown: doc.villageTown,
      district: doc.district,
      state: doc.state,
      pincode: doc.pincode,
      ...(doc.landmark ? { landmark: doc.landmark } : {}),
      ...(doc.label ? { label: doc.label } : {}),
      isDefault: doc.isDefault,
      ...(doc.createdAt ? { createdAt: doc.createdAt } : {}),
      ...(doc.updatedAt ? { updatedAt: doc.updatedAt } : {}),
    };
  }
}