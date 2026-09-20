import { Schema, Types } from 'mongoose';
import { localizedText, seoProps } from './common.js';

const categorySchema = new Schema(
  {
    name: { ...localizedText },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    parentId: { type: Types.ObjectId, ref: 'Category', default: undefined },
    imageMediaId: { type: Types.ObjectId, ref: 'Media' },
    bannerMediaId: { type: Types.ObjectId, ref: 'Media' },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    seo: { ...seoProps },
  },
  { collection: 'categories', timestamps: true },
);

categorySchema.index({ parentId: 1 });
categorySchema.index({ active: 1, sortOrder: 1 });

export { categorySchema };
export default categorySchema;
export const CATEGORY_MODEL = 'Category';