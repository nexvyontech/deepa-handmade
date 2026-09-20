import { PAYMENT_METHODS, PAYMENT_STATES } from '@deepa/shared';
import { Schema, Types } from 'mongoose';
import { addressSnapshot } from './common.js';

const invoiceItemSchema = new Schema(
  {
    lineNo: { type: Number, required: true, min: 1 },
    productNameEn: { type: String, trim: true },
    productNameTa: { type: String, trim: true },
    variantLabel: { type: String, trim: true },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discountPerUnit: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: true },
);

const invoiceSchema = new Schema(
  {
    invoiceNo: { type: String, required: true, unique: true, trim: true },
    orderId: { type: Types.ObjectId, ref: 'Order', required: true, unique: true },
    businessSnapshot: {
      name: { type: String, trim: true },
      address: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
    },
    customerSnapshot: {
      name: { type: String, trim: true },
      mobile: { type: String, trim: true },
      email: { type: String, trim: true },
    },
    addressSnapshot: { type: addressSnapshot, required: true },
    items: { type: [invoiceItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: Object.values(PAYMENT_METHODS), required: true },
    paymentStatus: { type: String, enum: Object.values(PAYMENT_STATES), required: true },
    taxFields: {
      gstType: { type: String, trim: true },
      gstin: { type: String, trim: true },
      cgst: { type: Number, min: 0 },
      sgst: { type: Number, min: 0 },
      igst: { type: Number, min: 0 },
    },
    status: { type: String, enum: ['ISSUED', 'PAID', 'CANCELLED'], default: 'ISSUED' },
    issuedAt: { type: Date, default: Date.now },
    issuedBy: { type: Types.ObjectId, ref: 'User' },
  },
  { collection: 'invoices', timestamps: true },
);

invoiceSchema.index({ status: 1, issuedAt: 1 });
invoiceSchema.index({ orderId: 1 }, { unique: true });

export { invoiceSchema, invoiceItemSchema };
export default invoiceSchema;
export const INVOICE_MODEL = 'Invoice';