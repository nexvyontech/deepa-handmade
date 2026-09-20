import { Schema, Types } from 'mongoose';
import { localizedText, seoProps } from './common.js';

const productSchema = new Schema(
  {
    name: { ...localizedText },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    sku: { type: String, required: true, unique: true, trim: true },
    shortDesc: { type: String, trim: true },
    description: { type: String, trim: true },
    categoryId: { type: Types.ObjectId, ref: 'Category' },
    basePrice: { type: Number, required: true, min: 0 },
    mrp: { type: Number, min: 0 },
    moq: { type: Number, required: true, default: 1, min: 1 },
    weightKg: { type: Number, min: 0 },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      unit: { type: String, trim: true },
    },
    materialText: { ...localizedText },
    tags: { type: [String], default: [] },
    status: { type: String, enum: ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'], default: 'DRAFT' },
    featured: { type: Boolean, default: false },
    customizable: { type: Boolean, default: false },
    seo: { ...seoProps },
    ratingSummary: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
    },
    searchText: { type: String, default: '', trim: true },
    createdBy: { type: Types.ObjectId, ref: 'User' },
    updatedBy: { type: Types.ObjectId, ref: 'User' },
  },
  { collection: 'products', timestamps: true },
);

productSchema.index({ categoryId: 1, status: 1 });
productSchema.index({ status: 1, featured: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ searchText: 1 });
productSchema.index({ createdAt: -1 });

export { productSchema };
export default productSchema;
export const PRODUCT_MODEL = 'Product';