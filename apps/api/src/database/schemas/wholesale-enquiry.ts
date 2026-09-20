import { Schema, Types } from 'mongoose';

const wholesaleEnquirySchema = new Schema(
  {
    enquiryNo: { type: String, required: true, unique: true, trim: true },
    businessName: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    productId: { type: Types.ObjectId, ref: 'Product' },
    qty: { type: Number, required: true, min: 1 },
    expectedPrice: { type: Number, min: 0 },
    deliveryLocation: { type: String, trim: true },
    requiredDate: { type: Date },
    message: { type: String, trim: true },
    tierId: { type: Types.ObjectId, ref: 'WholesaleTier' },
    status: {
      type: String,
      enum: ['NEW', 'QUOTED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'],
      default: 'NEW',
    },
  },
  { collection: 'wholesale-enquiries', timestamps: true },
);

wholesaleEnquirySchema.index({ status: 1, createdAt: 1 });
wholesaleEnquirySchema.index({ businessName: 1 });

export { wholesaleEnquirySchema };
export default wholesaleEnquirySchema;
export const WHOLESALE_ENQUIRY_MODEL = 'WholesaleEnquiry';