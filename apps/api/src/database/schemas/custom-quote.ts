import { Schema, Types } from 'mongoose';

const customQuoteSchema = new Schema(
  {
    requestId: { type: Types.ObjectId, ref: 'CustomRequest', required: true },
    version: { type: Number, required: true, min: 1 },
    costs: {
      material: { type: Number, default: 0, min: 0 },
      labour: { type: Number, default: 0, min: 0 },
      packaging: { type: Number, default: 0, min: 0 },
      shipping: { type: Number, default: 0, min: 0 },
      misc: { type: Number, default: 0, min: 0 },
    },
    margin: { type: Number, default: 0, min: 0 },
    quoteTotal: { type: Number, required: true, min: 0 },
    validUntil: { type: Date, required: true },
    status: {
      type: String,
      enum: ['OPEN', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'SUPERSEDED'],
      default: 'OPEN',
    },
    conversion: {
      orderId: { type: Types.ObjectId, ref: 'Order' },
      at: { type: Date },
      byUserId: { type: Types.ObjectId, ref: 'User' },
    },
  },
  { collection: 'custom-quotes', timestamps: true },
);

customQuoteSchema.index({ requestId: 1, version: 1 }, { unique: true });
customQuoteSchema.index({ requestId: 1 }, {
  unique: true,
  partialFilterExpression: { status: 'OPEN' },
});
customQuoteSchema.index({ status: 1, validUntil: 1 });

export { customQuoteSchema };
export default customQuoteSchema;
export const CUSTOM_QUOTE_MODEL = 'CustomQuote';