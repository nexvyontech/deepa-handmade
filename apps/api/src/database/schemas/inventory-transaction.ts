import { Schema, Types } from 'mongoose';

const inventoryTransactionSchema = new Schema(
  {
    itemId: { type: Types.ObjectId, ref: 'InventoryItem', required: true },
    seq: { type: Number, required: true, min: 1 },
    type: {
      type: String,
      enum: ['OPENING', 'RECEIVE', 'RESERVE', 'RELEASE', 'CONSUME', 'ADJUST', 'DAMAGE', 'SALE_OUT', 'SALE_CANCEL', 'RETURN_IN'],
      required: true,
    },
    qty: { type: Number, required: true },
    balanceAfter: { type: Number, required: true, min: 0 },
    referenceType: { type: String, trim: true },
    referenceId: { type: Types.ObjectId },
    reason: { type: String, trim: true },
    actorId: { type: Types.ObjectId, ref: 'User' },
    actorRole: { type: String, trim: true },
    postedAt: { type: Date, default: Date.now },
  },
  { collection: 'inventory-transactions', timestamps: { createdAt: true, updatedAt: false } },
);

inventoryTransactionSchema.index({ itemId: 1, seq: 1 }, { unique: true });
inventoryTransactionSchema.index({ itemId: 1, createdAt: 1 });
inventoryTransactionSchema.index({ referenceType: 1, referenceId: 1 });
inventoryTransactionSchema.index({ actorId: 1 });

export { inventoryTransactionSchema };
export default inventoryTransactionSchema;
export const INVENTORY_TRANSACTION_MODEL = 'InventoryTransaction';