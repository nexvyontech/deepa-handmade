import { SHIPPING_STATES } from '@deepa/shared';
import { Schema, Types } from 'mongoose';

const shipmentSchema = new Schema(
  {
    shipmentNo: { type: String, required: true, unique: true, trim: true },
    orderId: { type: Types.ObjectId, ref: 'Order', required: true },
    returnRequestId: { type: Types.ObjectId, ref: 'ReturnRequest' },
    courier: { type: String, trim: true },
    trackingNumber: { type: String, unique: true, sparse: true, trim: true },
    shipDate: { type: Date },
    expectedDelivery: { type: Date },
    deliveredAt: { type: Date },
    status: { type: String, enum: Object.values(SHIPPING_STATES), default: 'PENDING' },
    failureReason: { type: String, trim: true },
  },
  { collection: 'shipments', timestamps: true },
);

shipmentSchema.index({ orderId: 1 });
shipmentSchema.index({ status: 1, expectedDelivery: 1 });
shipmentSchema.index({ courier: 1, trackingNumber: 1 });

export { shipmentSchema };
export default shipmentSchema;
export const SHIPMENT_MODEL = 'Shipment';