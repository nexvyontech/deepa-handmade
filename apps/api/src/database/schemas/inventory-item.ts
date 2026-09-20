import { Schema, Types } from 'mongoose';
import { localizedText } from './common.js';

const inventoryItemSchema = new Schema(
  {
    itemCode: { type: String, required: true, unique: true, trim: true },
    itemName: { ...localizedText },
    type: { type: String, enum: ['FINISHED', 'RAW', 'PACKAGING'], required: true },
    unit: { type: String, enum: ['KG', 'METER', 'PIECE', 'SET'], required: true },
    availableQty: { type: Number, default: 0, min: 0 },
    reservedQty: { type: Number, default: 0, min: 0 },
    reorderLevel: { type: Number, default: 0, min: 0 },
    reorderQty: { type: Number, min: 1 },
    supplierId: { type: Types.ObjectId, ref: 'Supplier' },
    lastPurchaseCost: { type: Number, min: 0 },
    avgCost: { type: Number, min: 0 },
    variantId: { type: Types.ObjectId, ref: 'ProductVariant' },
    location: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { collection: 'inventory-items', timestamps: true },
);

inventoryItemSchema.index({ type: 1, availableQty: 1, reorderLevel: 1 });
inventoryItemSchema.index({ supplierId: 1 });
inventoryItemSchema.index({ variantId: 1 });

export { inventoryItemSchema };
export default inventoryItemSchema;
export const INVENTORY_ITEM_MODEL = 'InventoryItem';