import { HttpStatus, Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ERROR_CODES } from '../../common/errors/error-codes.js';
import { ApiException } from '../../common/exceptions/api.exception.js';

/** Shipping configuration read from the singleton `settings` document. */
export interface ShippingConfig {
  mode: 'FLAT_FREE_THRESHOLD';
  flatFee?: number;
  freeThreshold?: number;
}

export interface SiteSettingsDoc {
  _id: Types.ObjectId;
  business?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  upi?: {
    enabled?: boolean;
    upiId?: string;
  };
  cod?: {
    enabled?: boolean;
  };
  shipping?: {
    mode?: string;
    flatFee?: number;
    freeThreshold?: number;
  };
}

/**
 * Read access to the singleton `settings` document. No write surface yet:
 * settings administration arrives with the order/payment phase.
 */
@Injectable()
export class SettingsService {
  constructor(
    @Optional()
    @InjectModel('SiteSetting')
    private readonly model: Model<any>,
  ) {}

  private ensureReady(): void {
    if (!this.model) {
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'Settings service is unavailable',
      );
    }
  }

  async getSettings(): Promise<SiteSettingsDoc | null> {
    this.ensureReady();
    const doc = await this.model.findOne().sort({ createdAt: 1 }).limit(1);
    return (doc as SiteSettingsDoc) ?? null;
  }

  async getShippingConfig(): Promise<ShippingConfig | null> {
    const doc = await this.getSettings();
    const shipping = doc?.shipping;
    if (!shipping) return null;
    return {
      mode: shipping.mode === 'FLAT_FREE_THRESHOLD' ? 'FLAT_FREE_THRESHOLD' : 'FLAT_FREE_THRESHOLD',
      ...(typeof shipping.flatFee === 'number' ? { flatFee: shipping.flatFee } : {}),
      ...(typeof shipping.freeThreshold === 'number'
        ? { freeThreshold: shipping.freeThreshold }
        : {}),
    };
  }
}