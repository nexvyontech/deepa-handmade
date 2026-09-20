import { Schema, Types } from 'mongoose';
import { localizedText } from './common.js';

const wholesaleTierSchema = new Schema(
  {
    name: { ...localizedText },
    scope: { type: String, enum: ['GLOBAL', 'PRODUCT', 'CATEGORY'], required: true },
    productIds: { type: [Types.ObjectId], ref: 'Product', default: [] },
    categoryIds: { type: [Types.ObjectId], ref: 'Category', default: [] },
    minQty: { type: Number, required: true, min: 1 },
    maxQty: { type: Number, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true },
  },
  { collection: 'wholesale-tiers', timestamps: true },
);

wholesaleTierSchema.index({ scope: 1, active: 1 });
wholesaleTierSchema.index({ productIds: 1 });
wholesaleTierSchema.index({ categoryIds: 1 });

export { wholesaleTierSchema };
export default wholesaleTierSchema;
export const WHOLESALE_TIER_MODEL = 'WholesaleTier';