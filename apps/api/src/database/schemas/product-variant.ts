import { Schema, Types } from 'mongoose';

const productVariantSchema = new Schema(
  {
    productId: { type: Types.ObjectId, ref: 'Product', required: true },
    optionValueIds: { type: [Types.ObjectId], ref: 'VariantOption', default: [] },
    comboHash: { type: String, required: true },
    variantSku: { type: String, unique: true, sparse: true, trim: true },
    priceDelta: { type: Number, default: 0, min: 0 },
    stockMode: { type: String, enum: ['INVENTORY_TRACKED', 'AVAILABLE_ONLY'], default: 'AVAILABLE_ONLY' },
    inventoryItemId: { type: Types.ObjectId, ref: 'InventoryItem' },
    active: { type: Boolean, default: true },
    imageMediaIds: { type: [Types.ObjectId], ref: 'Media', default: [] },
    isCustomColor: { type: Boolean, default: false },
    isCustomSize: { type: Boolean, default: false },
  },
  { collection: 'product-variants', timestamps: true },
);

productVariantSchema.index({ productId: 1, comboHash: 1 }, { unique: true });
productVariantSchema.index({ productId: 1, active: 1 });
productVariantSchema.index({ inventoryItemId: 1 });

export { productVariantSchema };
export default productVariantSchema;
export const PRODUCT_VARIANT_MODEL = 'ProductVariant';