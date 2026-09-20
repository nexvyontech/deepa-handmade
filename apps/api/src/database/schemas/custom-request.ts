import { Schema, Types } from 'mongoose';

const clarificationEntrySchema = new Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, trim: true },
    byUserId: { type: Types.ObjectId, ref: 'User' },
    byCustomer: { type: Boolean, default: false },
    at: { type: Date, required: true },
  },
  { _id: true },
);

const customRequestSchema = new Schema(
  {
    requestNo: { type: String, required: true, unique: true, trim: true },
    customer: {
      customerId: { type: Types.ObjectId, ref: 'User' },
      name: { type: String, required: true, trim: true },
      mobile: { type: String, required: true, trim: true },
      email: { type: String, trim: true },
    },
    productType: { type: Types.ObjectId, ref: 'Product' },
    size: { type: String, trim: true },
    colorDesign: { type: String, trim: true },
    handle: { type: String, trim: true },
    qty: { type: Number, required: true, min: 1 },
    requiredDate: { type: Date },
    budget: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
    },
    notes: { type: String, trim: true },
    clarificationLog: { type: [clarificationEntrySchema], default: [] },
    referenceMediaIds: { type: [Types.ObjectId], ref: 'Media', default: [] },
    status: {
      type: String,
      enum: ['NEW', 'CLARIFICATION', 'COSTED', 'QUOTED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'],
      default: 'NEW',
    },
  },
  { collection: 'custom-requests', timestamps: true },
);

customRequestSchema.index({ 'customer.customerId': 1, createdAt: 1 });
customRequestSchema.index({ status: 1 });

export { customRequestSchema };
export default customRequestSchema;
export const CUSTOM_REQUEST_MODEL = 'CustomRequest';