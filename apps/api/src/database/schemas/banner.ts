import { Schema, Types } from 'mongoose';
import { optionalLocalizedText } from './common.js';

const bannerSchema = new Schema(
  {
    title: { ...optionalLocalizedText },
    imageMediaId: { type: Types.ObjectId, ref: 'Media', required: true },
    ctaUrl: { type: String, trim: true },
    ctaLabel: { ...optionalLocalizedText },
    target: { type: String, enum: ['PRODUCT', 'CATEGORY', 'PAGE', 'EXTERNAL'] },
    location: { type: String, default: 'HOME', trim: true },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    startAt: { type: Date },
    endAt: { type: Date },
  },
  { collection: 'banners', timestamps: true },
);

bannerSchema.index({ active: 1, sortOrder: 1 });

export { bannerSchema };
export default bannerSchema;
export const BANNER_MODEL = 'Banner';