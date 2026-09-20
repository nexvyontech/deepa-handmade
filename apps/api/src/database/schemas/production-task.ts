import { PRODUCTION_STATES } from '@deepa/shared';
import { Schema, Types } from 'mongoose';

const materialPlanEntrySchema = new Schema(
  {
    itemId: { type: Types.ObjectId, ref: 'InventoryItem', required: true },
    qtyNeeded: { type: Number, required: true, min: 0 },
    issuedQty: { type: Number, default: 0, min: 0 },
  },
  { _id: true },
);

const issuedMaterialEntrySchema = new Schema(
  {
    itemId: { type: Types.ObjectId, ref: 'InventoryItem', required: true },
    qty: { type: Number, required: true, min: 0 },
    issuedAt: { type: Date, default: Date.now },
    issuedBy: { type: Types.ObjectId, ref: 'User' },
  },
  { _id: true },
);

const productTaskSnapshotSchema = new Schema(
  {
    productId: { type: Types.ObjectId, ref: 'Product' },
    sku: { type: String, trim: true },
    nameEn: { type: String, trim: true },
    nameTa: { type: String, trim: true },
    variantId: { type: Types.ObjectId, ref: 'ProductVariant' },
    variantSku: { type: String, trim: true },
    variantOptionsLabel: { type: String, trim: true },
  },
  { _id: false },
);

const productionTaskSchema = new Schema(
  {
    taskNo: { type: String, required: true, unique: true, trim: true },
    orderId: { type: Types.ObjectId, ref: 'Order', required: true },
    orderItemRefs: { type: [Types.ObjectId], ref: 'Order', default: [] },
    productSnapshot: { type: productTaskSnapshotSchema },
    plannedQty: { type: Number, required: true, min: 1 },
    completedQty: { type: Number, default: 0, min: 0 },
    assignedStaffIds: { type: [Types.ObjectId], ref: 'User', default: [] },
    requiredDate: { type: Date },
    materialPlan: { type: [materialPlanEntrySchema], default: [] },
    issuedMaterial: { type: [issuedMaterialEntrySchema], default: [] },
    status: { type: String, enum: Object.values(PRODUCTION_STATES), default: 'PENDING' },
    onHoldReason: { type: String, trim: true },
    timeline: [
      {
        status: { type: String, required: true, trim: true },
        byUserId: { type: Types.ObjectId, ref: 'User' },
        at: { type: Date, required: true },
      },
    ],
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { collection: 'production-tasks', timestamps: true },
);

productionTaskSchema.index({ orderId: 1 });
productionTaskSchema.index({ status: 1, requiredDate: 1 });
productionTaskSchema.index({ assignedStaffIds: 1 });

export { productionTaskSchema, productTaskSnapshotSchema };
export default productionTaskSchema;
export const PRODUCTION_TASK_MODEL = 'ProductionTask';