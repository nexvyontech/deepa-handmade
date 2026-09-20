import { Schema, Types } from 'mongoose';

const purchaseItemSchema = new Schema(
  {
    itemId: { type: Types.ObjectId, ref: 'InventoryItem', required: true },
    itemCode: { type: String, required: true, trim: true },
    itemNameEn: { type: String, trim: true },
    itemNameTa: { type: String, trim: true },
    uom: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 0 },
    costPerUnit: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: true },
);

const purchaseSchema = new Schema(
  {
    purchaseNo: { type: String, required: true, unique: true, trim: true },
    supplierId: { type: Types.ObjectId, ref: 'Supplier', required: true },
    items: { type: [purchaseItemSchema], required: true },
    status: { type: String, enum: ['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'], default: 'DRAFT' },
    orderedAt: { type: Date },
    receivedAt: { type: Date },
    receivedBy: { type: Types.ObjectId, ref: 'User' },
    total: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true },
  },
  { collection: 'purchases', timestamps: true },
);

purchaseSchema.index({ supplierId: 1, createdAt: 1 });
purchaseSchema.index({ status: 1 });

export { purchaseSchema, purchaseItemSchema };
export default purchaseSchema;
export const PURCHASE_MODEL = 'Purchase';