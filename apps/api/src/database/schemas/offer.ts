import { Schema, Types } from 'mongoose';
import { localizedText } from './common.js';

const offerSchema = new Schema(
  {
    name: { ...localizedText },
    code: { type: String, trim: true, default: undefined },
    type: {
      type: String,
      enum: ['PRODUCT', 'CATEGORY', 'FESTIVAL', 'FIRST_ORDER', 'BULK'],
      required: true,
    },
    scope: {
      productIds: { type: [Types.ObjectId], ref: 'Product', default: [] },
      categoryIds: { type: [Types.ObjectId], ref: 'Category', default: [] },
    },
    discountType: { type: String, enum: ['FLAT', 'PERCENT'], required: true },
    value: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    minOrderValue: { type: Number, min: 0 },
    bulkRules: {
      minQty: { type: Number, min: 1 },
    },
    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },
    active: { type: Boolean, default: true },
    usageLimit: { type: Number, default: undefined },
    usedCount: { type: Number, default: 0, min: 0 },
    perCustomerLimit: { type: Number, default: undefined },
  },
  { collection: 'offers', timestamps: true },
);

offerSchema.index({ type: 1, active: 1, validFrom: 1, validTo: 1 });
offerSchema.index({ 'scope.productIds': 1 });
offerSchema.index({ 'scope.categoryIds': 1 });
offerSchema.index({ code: 1 });

export { offerSchema };
export default offerSchema;
export const OFFER_MODEL = 'Offer';