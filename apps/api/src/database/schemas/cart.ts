import { Schema, Types } from 'mongoose';

const cartItemSchema = new Schema(
  {
    productId: { type: Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Types.ObjectId, ref: 'ProductVariant' },
    qty: { type: Number, required: true, min: 1 },
    moq: { type: Number, default: 1, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    customDetails: {
      colorText: { type: String, trim: true },
      sizeText: { type: String, trim: true },
      handleText: { type: String, trim: true },
      notes: { type: String, trim: true },
    },
  },
  { _id: true },
);

const cartSchema = new Schema(
  {
    ownerId: { type: Types.ObjectId, ref: 'User', default: undefined },
    sessionId: { type: String, trim: true, default: undefined },
    items: { type: [cartItemSchema], default: [] },
    totals: {
      subtotal: { type: Number, default: 0, min: 0 },
      discount: { type: Number, default: 0, min: 0 },
      shipping: { type: Number, default: 0, min: 0 },
      grandTotal: { type: Number, default: 0, min: 0 },
    },
    couponCode: { type: String, trim: true },
    offerAppliedIds: { type: [Types.ObjectId], ref: 'Offer', default: [] },
    version: { type: Number, default: 1, min: 0 },
    expiresAt: { type: Date },
  },
  { collection: 'carts', timestamps: true },
);

cartSchema.index({ ownerId: 1 }, { unique: true, partialFilterExpression: { ownerId: { $type: 'objectId' } } });
cartSchema.index({ sessionId: 1 }, { unique: true, partialFilterExpression: { sessionId: { $type: 'string' } } });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
cartSchema.index({ version: 1 });

export { cartSchema, cartItemSchema };
export default cartSchema;
export const CART_MODEL = 'Cart';