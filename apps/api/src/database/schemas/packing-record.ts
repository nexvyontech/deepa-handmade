import { Schema, Types } from 'mongoose';

const packingRecordSchema = new Schema(
  {
    packageNo: { type: String, required: true, unique: true, trim: true },
    orderId: { type: Types.ObjectId, ref: 'Order', required: true },
    itemCount: { type: Number, required: true, min: 1 },
    weightKg: { type: Number, min: 0 },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      unit: { type: String, trim: true },
    },
    notes: { type: String, trim: true },
    status: { type: String, enum: ['PACKING', 'PACKED'], default: 'PACKING' },
    packedBy: { type: Types.ObjectId, ref: 'User' },
    packedAt: { type: Date },
  },
  { collection: 'packing-records', timestamps: true },
);

packingRecordSchema.index({ orderId: 1 });
packingRecordSchema.index({ status: 1 });

export { packingRecordSchema };
export default packingRecordSchema;
export const PACKING_RECORD_MODEL = 'PackingRecord';