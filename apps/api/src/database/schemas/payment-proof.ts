import { Schema, Types } from 'mongoose';

const paymentProofSchema = new Schema(
  {
    paymentId: { type: Types.ObjectId, ref: 'Payment', required: true },
    mediaId: { type: Types.ObjectId, ref: 'Media', required: true },
    utr: { type: String, trim: true },
    amountPaid: { type: Number, min: 0 },
    notes: { type: String, trim: true },
    submittedBy: { type: Types.ObjectId, ref: 'User', required: true },
    resubmitSequence: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['SUBMITTED', 'ACCEPTED', 'REJECTED_REFER_TO_NEW'],
      default: 'SUBMITTED',
    },
  },
  { collection: 'payment-proofs', timestamps: { createdAt: true, updatedAt: false } },
);

paymentProofSchema.index({ paymentId: 1, resubmitSequence: 1 });

export { paymentProofSchema };
export default paymentProofSchema;
export const PAYMENT_PROOF_MODEL = 'PaymentProof';