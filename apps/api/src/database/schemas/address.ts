import { Schema, Types } from 'mongoose';

const addressSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    recipient: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    villageTown: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true },
    label: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { collection: 'addresses', timestamps: true },
);

addressSchema.index({ userId: 1, isDefault: 1 });

export { addressSchema };
export default addressSchema;
export const ADDRESS_MODEL = 'Address';