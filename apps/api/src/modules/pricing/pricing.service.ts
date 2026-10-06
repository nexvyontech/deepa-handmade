import { HttpStatus, Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditService } from '../../common/auth/audit.service.js';
import { ERROR_CODES } from '../../common/errors/error-codes.js';
import { ApiException } from '../../common/exceptions/api.exception.js';
import { roundMoney } from '../../common/utils/money.js';
import { UpdatePricingDto } from './dto/pricing.dto.js';

export interface ActorContext {
  id: string;
  role: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Pricing operations (Phase 5). Only this module may change the price fields
 * of a product (`basePrice`, `mrp`, `moq`); every change is audited as
 * `PRICE_CHANGED`. Variant deltas are managed by the variants module.
 */
@Injectable()
export class PricingService {
  constructor(
    private readonly audit: AuditService,
    @Optional()
    @InjectModel('Product')
    private readonly product: Model<any>,
  ) {}

  private ensureReady(): void {
    if (!this.product) {
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'Pricing service is unavailable',
      );
    }
  }

  async updateProductPrice(
    productId: string,
    dto: UpdatePricingDto,
    actor: ActorContext,
  ): Promise<{ id: string; basePrice: number; mrp?: number; moq: number }> {
    this.ensureReady();
    if (!Types.ObjectId.isValid(productId)) throw ApiException.notFound('Product not found');
    const doc = await this.product.findById(new Types.ObjectId(productId));
    if (!doc) throw ApiException.notFound('Product not found');

    const before = { basePrice: doc.basePrice, mrp: doc.mrp, moq: doc.moq };
    const after: { basePrice?: number; mrp?: number; moq?: number } = {};

    if (dto.basePrice !== undefined) {
      doc.basePrice = roundMoney(dto.basePrice);
      after.basePrice = doc.basePrice;
    }
    if (dto.mrp !== undefined) {
      doc.mrp = roundMoney(dto.mrp);
      after.mrp = doc.mrp;
    }
    if (dto.moq !== undefined) {
      doc.moq = dto.moq;
      after.moq = doc.moq;
    }

    await doc.save();
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'PRICE_CHANGED',
      entityType: 'product',
      entityId: productId,
      before,
      after,
      meta: { ip: actor.ip, userAgent: actor.userAgent },
    });

    return { id: productId, basePrice: doc.basePrice, ...(doc.mrp !== undefined ? { mrp: doc.mrp } : {}), moq: doc.moq };
  }
}