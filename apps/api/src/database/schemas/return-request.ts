import { RETURN_STATES } from '@deepa/shared';
import { Schema, Types } from 'mongoose';
import { addressSnapshot } from './common.js';

const returnRequestSchema = new Schema(
  {
    returnNo: { type: String, required: true, unique: true, trim: true },
    orderId: { type: Types.ObjectId, ref: 'Order', required: true },
    reason: { type: String, enum: ['DAMAGED', 'WRONG_ITEM', 'QUALITY', 'DELAYED', 'OTHER'], required: true },
    description: { type: String, trim: true },
    evidenceRefs: { type: [Types.ObjectId], ref: 'Media', default: [] },
    pickupAddressSnapshot: { type: addressSnapshot },
    status: { type: String, enum: Object.values(RETURN_STATES), default: 'REQUESTED' },
    decisionReason: { type: String, trim: true },
    decidedBy: { type: Types.ObjectId, ref: 'User' },
    decidedAt: { type: Date },
    receivedAt: { type: Date },
    receivedBy: { type: Types.ObjectId, ref: 'User' },
    refundId: { type: Types.ObjectId, ref: 'Refund' },
  },
  { collection: 'return-requests', timestamps: true },
);

returnRequestSchema.index({ orderId: 1 });
returnRequestSchema.index({ status: 1, createdAt: 1 });
returnRequestSchema.index({ 'orderId': 1 }, {
  unique: true,
  partialFilterExpression: { status: { $nin: ['RETURNED', 'REFUNDED', 'REJECTED'] } },
});

export { returnRequestSchema };
export default returnRequestSchema;
export const RETURN_REQUEST_MODEL = 'ReturnRequest';