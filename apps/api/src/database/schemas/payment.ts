import {
  COD_PAYMENT_STATES,
  PAYMENT_METHODS,
  PAYMENT_REJECTION_REASONS,
  UPI_PAYMENT_STATES,
} from '@deepa/shared';
import { Schema, Types } from 'mongoose';

const paymentSchema = new Schema(
  {
    orderId: { type: Types.ObjectId, ref: 'Order', required: true },
    attemptNo: { type: Number, required: true, min: 1 },
    method: { type: String, enum: Object.values(PAYMENT_METHODS), required: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: [...Object.values(UPI_PAYMENT_STATES), ...Object.values(COD_PAYMENT_STATES)],
      required: true,
    },
    utr: { type: String, trim: true },
    submittedAt: { type: Date },
    underReviewAt: { type: Date },
    rejection: {
      reason: { type: String, enum: Object.values(PAYMENT_REJECTION_REASONS) },
      note: { type: String, trim: true },
      rejectedBy: { type: Types.ObjectId, ref: 'User' },
      at: { type: Date },
    },
    confirmedBy: { type: Types.ObjectId, ref: 'User' },
    confirmedAt: { type: Date },
    codConfirmedBy: { type: Types.ObjectId, ref: 'User' },
    codConfirmedAt: { type: Date },
  },
  { collection: 'payments', timestamps: { createdAt: true, updatedAt: false } },
);

paymentSchema.index({ orderId: 1, attemptNo: 1 }, { unique: true });
paymentSchema.index({ status: 1, createdAt: 1 });
paymentSchema.index({ utr: 1 }, { unique: false, sparse: true });

export { paymentSchema };
export default paymentSchema;
export const PAYMENT_MODEL = 'Payment';