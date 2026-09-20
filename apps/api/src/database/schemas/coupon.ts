import { Schema, Types } from 'mongoose';

const couponSchema = new Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    discountType: { type: String, enum: ['FLAT', 'PERCENT'], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrderValue: { type: Number, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },
    usageLimit: { type: Number, default: undefined },
    usedCount: { type: Number, default: 0, min: 0 },
    perCustomerLimit: { type: Number, default: undefined },
    singleUsePerCustomer: { type: Boolean, default: false },
    applicableTo: {
      productIds: { type: [Types.ObjectId], ref: 'Product', default: [] },
      categoryIds: { type: [Types.ObjectId], ref: 'Category', default: [] },
    },
    active: { type: Boolean, default: true },
  },
  { collection: 'coupons', timestamps: true },
);

couponSchema.index({ code: 1, active: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
couponSchema.index({ validFrom: 1, validTo: 1, active: 1 });

export { couponSchema };
export default couponSchema;
export const COUPON_MODEL = 'Coupon';