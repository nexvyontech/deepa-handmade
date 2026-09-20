import { Schema } from 'mongoose';

const supplierSchema = new Schema(
  {
    supplierCode: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
    paymentTerms: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { collection: 'suppliers', timestamps: true },
);

supplierSchema.index({ active: 1 });
supplierSchema.index({ name: 1 });

export { supplierSchema };
export default supplierSchema;
export const SUPPLIER_MODEL = 'Supplier';