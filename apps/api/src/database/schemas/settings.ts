import { Schema, Types } from 'mongoose';
import { localizedText } from './common.js';

const siteSettingSchema = new Schema(
  {
    business: {
      name: { type: String, required: true, trim: true },
      logoMediaId: { type: Types.ObjectId, ref: 'Media' },
      address: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
    },
    upi: {
      enabled: { type: Boolean, default: false },
      upiId: { type: String, trim: true },
      upiQrMediaId: { type: Types.ObjectId, ref: 'Media' },
      instructions: { ...localizedText },
    },
    cod: {
      enabled: { type: Boolean, default: true },
      rules: {
        maxOrderValue: { type: Number, min: 0 },
        disabledLocations: { type: [String], default: [] },
      },
    },
    shipping: {
      mode: { type: String, enum: ['FLAT_FREE_THRESHOLD'], default: 'FLAT_FREE_THRESHOLD' },
      flatFee: { type: Number, min: 0 },
      freeThreshold: { type: Number, min: 0 },
    },
    orderPrefix: { type: String, default: 'DH', trim: true },
    orderSeq: { type: Number, default: 0, min: 0 },
    notificationRules: { type: Schema.Types.Mixed, default: {} },
    languageDefaults: {
      contentLanguageOrder: { type: String, enum: ['EN_FIRST', 'TA_FIRST'], default: 'EN_FIRST' },
    },
    review: {
      ratingScale: { type: Number, default: 5, min: 1, max: 10 },
    },
    retention: { type: Schema.Types.Mixed, default: {} },
  },
  { collection: 'settings', timestamps: true },
);

export { siteSettingSchema };
export default siteSettingSchema;
export const SITE_SETTING_MODEL = 'SiteSetting';