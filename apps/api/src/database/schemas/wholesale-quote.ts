import { Schema, Types } from 'mongoose';

const wholesaleQuoteSchema = new Schema(
  {
    enquiryId: { type: Types.ObjectId, ref: 'WholesaleEnquiry', required: true },
    version: { type: Number, required: true, min: 1 },
    tierId: { type: Types.ObjectId, ref: 'WholesaleTier' },
    productSnapshot: {
      productId: { type: Types.ObjectId, ref: 'Product' },
      nameEn: { type: String, trim: true },
      nameTa: { type: String, trim: true },
    },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    validUntil: { type: Date, required: true },
    status: {
      type: String,
      enum: ['OPEN', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'SUPERSEDED'],
      default: 'OPEN',
    },
    overrideBy: { type: Types.ObjectId, ref: 'User' },
    overrideNote: { type: String, trim: true },
    conversion: {
      orderId: { type: Types.ObjectId, ref: 'Order' },
      at: { type: Date },
      byUserId: { type: Types.ObjectId, ref: 'User' },
    },
  },
  { collection: 'wholesale-quotes', timestamps: true },
);

wholesaleQuoteSchema.index({ enquiryId: 1, version: 1 }, { unique: true });
wholesaleQuoteSchema.index({ enquiryId: 1 }, {
  unique: true,
  partialFilterExpression: { status: 'OPEN' },
});
wholesaleQuoteSchema.index({ status: 1, validUntil: 1 });

export { wholesaleQuoteSchema };
export default wholesaleQuoteSchema;
export const WHOLESALE_QUOTE_MODEL = 'WholesaleQuote';