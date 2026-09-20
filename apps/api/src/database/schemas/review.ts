import { Schema, Types } from 'mongoose';

const reviewSchema = new Schema(
  {
    productId: { type: Types.ObjectId, ref: 'Product', required: true },
    customerId: { type: Types.ObjectId, ref: 'User', required: true },
    orderId: { type: Types.ObjectId, ref: 'Order', required: true },
    orderItemRef: { type: Types.ObjectId },
    rating: { type: Number, required: true, min: 0, max: 5 },
    title: { type: String, trim: true },
    bodyText: { type: String, trim: true },
    imageMediaIds: { type: [Types.ObjectId], ref: 'Media', default: [] },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'HIDDEN'], default: 'PENDING' },
    moderatedBy: { type: Types.ObjectId, ref: 'User' },
    moderatedAt: { type: Date },
    hiddenReason: { type: String, trim: true },
    flagged: { type: Boolean, default: false },
  },
  { collection: 'reviews', timestamps: true },
);

reviewSchema.index({ productId: 1, status: 1, createdAt: 1 });
reviewSchema.index({ customerId: 1 });
reviewSchema.index({ status: 1 });
reviewSchema.index({ customerId: 1, orderId: 1 }, { unique: true });

export { reviewSchema };
export default reviewSchema;
export const REVIEW_MODEL = 'Review';