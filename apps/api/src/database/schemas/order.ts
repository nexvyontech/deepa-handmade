import {
  ORDER_STATES,
  PAYMENT_METHODS,
  PAYMENT_STATES,
} from '@deepa/shared';
import { Schema, Types } from 'mongoose';
import { addressSnapshot } from './common.js';

const orderItemSnapshotSchema = new Schema(
  {
    lineNo: { type: Number, required: true, min: 1 },
    refId: { type: Types.ObjectId, required: true },
    productSnapshot: {
      productId: { type: Types.ObjectId, ref: 'Product' },
      sku: { type: String, trim: true },
      nameEn: { type: String, trim: true },
      nameTa: { type: String, trim: true },
      slug: { type: String, trim: true },
    },
    variantSnapshot: {
      variantId: { type: Types.ObjectId, ref: 'ProductVariant' },
      variantSku: { type: String, trim: true },
      options: [
        {
          type: { type: String, trim: true },
          labelEn: { type: String, trim: true },
          labelTa: { type: String, trim: true },
          valueEn: { type: String, trim: true },
          valueTa: { type: String, trim: true },
          hex: { type: String, trim: true, uppercase: true },
        },
      ],
    },
    qty: { type: Number, required: true, min: 1 },
    moq: { type: Number, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    mrp: { type: Number, min: 0 },
    discountPerUnit: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    customization: {
      customRequestId: { type: Types.ObjectId, ref: 'CustomRequest' },
      colorText: { type: String, trim: true },
      sizeText: { type: String, trim: true },
      handleText: { type: String, trim: true },
      notes: { type: String, trim: true },
    },
    snapshotVersion: { type: Number, default: 1, min: 0 },
  },
  { _id: true },
);

const orderEventSchema = new Schema(
  {
    status: { type: String, required: true, trim: true },
    note: { type: String, trim: true },
    byUserId: { type: Types.ObjectId, ref: 'User' },
    at: { type: Date, required: true },
    source: { type: String, trim: true },
  },
  { _id: false },
);

const adminNoteSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User' },
    text: { type: String, required: true, trim: true },
    at: { type: Date, required: true },
    pinned: { type: Boolean, default: false },
  },
  { _id: true },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true },
    customer: {
      customerId: { type: Types.ObjectId, ref: 'User' },
      guest: { type: Boolean, required: true },
      name: { type: String, required: true, trim: true },
      mobile: { type: String, required: true, trim: true },
      email: { type: String, trim: true },
      profileType: { type: String, enum: ['CUSTOMER', 'STAFF'], default: 'CUSTOMER' },
    },
    addressSnapshot: { type: addressSnapshot, required: true },
    items: { type: [orderItemSnapshotSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    codFee: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    offerBreakdown: [
      {
        kind: { type: String, enum: ['OFFER', 'COUPON'], required: true },
        code: { type: String, trim: true },
        refId: { type: Types.ObjectId },
        savedAmount: { type: Number, default: 0, min: 0 },
        note: { type: String, trim: true },
      },
    ],
    paymentMethod: { type: String, enum: Object.values(PAYMENT_METHODS), required: true },
    paymentStatus: { type: String, enum: Object.values(PAYMENT_STATES), required: true },
    orderStatus: { type: String, enum: Object.values(ORDER_STATES), required: true },
    source: { type: String, enum: ['WEB', 'CUSTOM', 'WHOLESALE'], default: 'WEB' },
    customRequestId: { type: Types.ObjectId, ref: 'CustomRequest' },
    customQuoteId: { type: Types.ObjectId, ref: 'CustomQuote' },
    wholesaleQuoteId: { type: Types.ObjectId, ref: 'WholesaleQuote' },
    timeline: { type: [orderEventSchema], default: [] },
    adminNotes: { type: [adminNoteSchema], default: [] },
    cancellation: {
      reason: { type: String, trim: true },
      reasonCode: { type: String, trim: true },
      at: { type: Date },
      byUserId: { type: Types.ObjectId, ref: 'User' },
    },
    idempotencyKey: { type: String, unique: true, sparse: true, trim: true },
    invoiceId: { type: Types.ObjectId, ref: 'Invoice' },
    shipmentIds: { type: [Types.ObjectId], ref: 'Shipment', default: [] },
    productionTaskIds: { type: [Types.ObjectId], ref: 'ProductionTask', default: [] },
  },
  { collection: 'orders', timestamps: true },
);

orderSchema.index({ 'customer.customerId': 1, createdAt: 1 });
orderSchema.index({ orderStatus: 1, createdAt: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ source: 1 });
orderSchema.index({ createdAt: -1 });

export { orderSchema, orderItemSnapshotSchema, orderEventSchema };
export default orderSchema;
export const ORDER_MODEL = 'Order';