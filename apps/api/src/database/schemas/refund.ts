import { REFUND_STATES } from '@deepa/shared';
import { Schema, Types } from 'mongoose';

const refundSchema = new Schema(
  {
    orderId: { type: Types.ObjectId, ref: 'Order', required: true },
    paymentId: { type: Types.ObjectId, ref: 'Payment', required: true },
    returnRequestId: { type: Types.ObjectId, ref: 'ReturnRequest' },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['UPI_MANUAL'], required: true },
    status: { type: String, enum: Object.values(REFUND_STATES), required: true },
    reason: { type: String, required: true, trim: true },
    referenceUtr: { type: String, trim: true },
    initiatedBy: { type: Types.ObjectId, ref: 'User' },
    approvedBy: { type: Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    processedBy: { type: Types.ObjectId, ref: 'User' },
    processedAt: { type: Date },
    failureReason: { type: String, trim: true },
  },
  { collection: 'refunds', timestamps: true },
);

refundSchema.index({ orderId: 1 });
refundSchema.index({ paymentId: 1 });
refundSchema.index({ status: 1, createdAt: 1 });

export { refundSchema };
export default refundSchema;
export const REFUND_MODEL = 'Refund';